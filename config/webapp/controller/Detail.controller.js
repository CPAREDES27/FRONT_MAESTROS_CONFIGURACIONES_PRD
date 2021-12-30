/* global XLSX:true */
 /*global jszip:true*/ 
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/ui/core/BusyIndicator",
	"sap/ui/core/Fragment",
	"sap/m/MessageBox",
	"../lib/jszip",
	"../lib/xlsx",
	"./Fragments"
], function (
		BaseController, 
		JSONModel, 
		formatter, 
		mobileLibrary,
		BusyIndicator,
		Fragment,
		MessageBox,
		jszip,
		xlsxjs,
		Fragments) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	const HOST = "https://cf-nodejs-qas.cfapps.us10.hana.ondemand.com";

	return BaseController.extend("com.tasa.config.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit : function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy : false,
				delay : 0,
				lineItemListTitle : this.getResourceBundle().getText("detailLineItemTableHeading")
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			// Contenedor de controles
			this.mFields={};
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */


		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished : function (oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView"),
				oTable = this.getView().byId(oEvent.getParameter("id"));

			if(!oTable) oTable = sap.ui.getCore().byId(oEvent.getParameter("id"));

			let oBinding = oTable.getBinding("items");
			if(!oBinding) return;
			// only update the counter if the length is final
			if (oTable.getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		 onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout",  this.getModel("appView").getProperty("/previousLayout"));
			}
		},

		/**
		 * Event handler for select files in Carga de archivos
		 * @param {event} oEvent 
		 */
		onHandleSelectFile: function (oEvent) {
			let sIdUp = oEvent.getParameter("id"),
			oContext = oEvent.getSource().getBindingContext(),
			oModel = oContext.getModel();
			oModel.setProperty("/idUploader",sIdUp);
            var fileDetails2 = oEvent.getParameter("files")[0];
            sap.ui.getCore().fileUploadArr = [];
            if (fileDetails2) {
             var mimeDet2 = fileDetails2.type,
              fileName2 = fileDetails2.name;
              // Calling method....
              this.mimeDet = mimeDet2;
              this.fileName = fileName2;
              this.fileDetails = fileDetails2;
            } else {
             sap.ui.getCore().fileUploadArr = [];
            }
        },

		/**
		 * Event handler for select files in Carga
		 * @param {event} oEvent 
		 */
		onCargarArchivo:function(oEvent) {
			let that = this;
			let oModelMaster = this.getModel("DATOSMAESTRO");
			// cargar tabla
			let aFiles = oEvent.getParameter("files"),
			oFile = aFiles[0],
			aData;
			if (oFile && window.FileReader) {
				let reader = new FileReader();
				reader.onload = function(e) {
					let oWorkbook = XLSX.read(e.target.result, {
						type: 'binary'
					});
					oWorkbook.SheetNames.forEach(function (sheetName) {
						// Here is your object for every sheet in workbook
						aData = XLSX.utils.sheet_to_row_object_array(oWorkbook.Sheets[sheetName]);
					});
					// let oSheet = oWorkbook.Sheets[oWorkbook.SheetNames[0]];
					// let oData = XLSX.utils.sheet_to_json(oSheet);

					// Generación dinámica
					//Generar tabla
					that._renderTableArchivos(aData);
					
					/* aData.forEach(aItem => {
						var aColumnArchivo = new sap.m.Column({
							header: new sap.m.Text({
								aItem
							})
						})
					}); */
				};
				reader.readAsBinaryString(oFile);
			}

			oModelMaster.setProperty("/listaArchivos",aData)
		},


		/**
		 * Event handler for button 'Subir' in Carga Archivos
		 */
		onBase64coonversionMethod: function () {
			var self=this,
			dataFinal=null,
			fileMime = this.mimeDet,
			fileName = this.fileName,
			fileDetails = this.fileDetails,
			DocNum = "001";

			if (!FileReader.prototype.readAsBinaryString) {
			 	FileReader.prototype.readAsBinaryString = function (fileData) {
			  		var binary = "",
			  		reader = new FileReader();

					reader.onload = function (e) {
			  			var bytes = new Uint8Array(reader.result),
			   			length = bytes.byteLength;

			   			for (var i = 0; i < length; i++) {
							binary += String.fromCharCode(bytes[i]);
			   			};
			   			self.base64ConversionRes = btoa(binary);
			   			sap.ui.getCore().fileUploadArr.push({
							"DocumentType": DocNum,
							"MimeType": fileMime,
							"FileName": fileName,
							"Content": self.base64ConversionRes,
			   			});
					};
			 
					reader.readAsArrayBuffer(fileData);
			 	};
			}

			var base=null,
			reader = new FileReader();

			reader.onload = function (readerEvt) {
				var binaryString = readerEvt.target.result;
				self.base64ConversionRes = btoa(binaryString);
				dataFinal=btoa(binaryString);
			
				self._enviarData(dataFinal,fileName);
				
			};
			
			if(!fileDetails){
				MessageBox.error("Debe cargar un archivo antes de enviar");
			}
			this.fileDetails=null;
			reader.readAsBinaryString(fileDetails);
		},

		onSuggestionItemSelected:function(oEvent){
			let oRow = oEvent.getParameter("selectedRow"),
			oInput = oEvent.getSource(),
			oValue=oRow.getCells()[1].getText();
			oInput.setDescription(oValue);
		},

		onSaveNewDistribFlota:function(oEvent){
			this.Count = 0; 
            this.CountService = 2;
			let oModel = this.getModel("DATOSMAESTRO"),
			oData = oModel.getProperty("/form"),
			oContext = oEvent.getSource().getBindingContext(),
			oMaster = oContext.getObject(),
			oServiceUpdate = oMaster.services.find(oServ => oServ.IDSERVICE === "UPDATE"),
			aOpcion = [],
			sCase = oModel.getProperty("/caseUpdate");
			if(!("CLSIS" in oData)){
				oData = oEvent.getSource().getBindingContext("DATOSMAESTRO").getObject();
			}
			let oParam = {
				data: "",
				fieldWhere: sCase==="E" ? "CLSIS" : "",
				flag: "",
				keyWhere: oData["CLSIS"] || "",
				opcion: aOpcion,
				p_case: sCase,
				p_user: "FGARCIA",
				tabla: oServiceUpdate.TABLA
			},
			aKeys = Object.keys(oData);
			aKeys.forEach(key=>{
				aOpcion.push({
					field: key,
					valor: oData[key]
				})
			});
			
			oServiceUpdate.param = oParam;

			this._updateService(oServiceUpdate,oMaster);
			this.onCloseDialog(oEvent);
		},

		onCloseDialog:function(oEvent){
			let oDialog = oEvent.getSource().getParent();
			oDialog.close();
		},

		/**
		 * Event handler for validation's combos
		 * @param {event} oEvent 
		 */
		onHandleChange:function(oEvent){
			let oValidatedComboBox = oEvent.getSource(),
				sSelectedKey = oValidatedComboBox.getSelectedKey(),
				sValue = oValidatedComboBox.getValue();

			if (!sSelectedKey && sValue) {
				oValidatedComboBox.setValueState("Error");
				oValidatedComboBox.setValueStateText("Ingrese un dato válido");
			} else {
				oValidatedComboBox.setValueState("None");
			}
		},

		/**
		 * Evento del footer de la pagina
		 */
		 onGuardar:function(oEvent){
			this.Count = 0; 
            this.CountService = 2;
			let oContext = oEvent.getSource().getBindingContext(),
			oMaster = oContext.getObject(),
			oServiceUpdate = oMaster.services.find(oServ=>oServ.IDSERVICE==="UPDATE"),
			oModelMaster = this.getModel("DATOSMAESTRO"),
			oDataUpdate = "",
			aOpcion=[],
			aKeys=[],
			oFieldExist,
			sFieldWhere,
			sKeyWhere;

			oDataUpdate = oModelMaster.getProperty("/LISTACONTROLDECOMBUSTIBLE/0");
			if(!oDataUpdate) oDataUpdate = oModelMaster.getProperty("/LISTACONTROLDEVIVERES/0");
			if(!oDataUpdate) oDataUpdate = oModelMaster.getProperty("/LISTACONFEVENTOSPESCA");
			if(!oDataUpdate) oDataUpdate = oModelMaster.getProperty("/LISTAPRECIOSPESCA/0");
			
			switch(oMaster.IDAPP) {
				case "C14":
					BusyIndicator.show(0);
					let aDataListaArchivos = oModelMaster.getProperty("/listaArchivos");
					if(aDataListaArchivos && aDataListaArchivos.length > 0){
						this.cargaDinamicaArchivos(aDataListaArchivos);
					}
					break;
				case "C09":
					oDataUpdate.HRCOR = this.formatter.setFormatHour(oDataUpdate["HRCOR"]);
					// delete oDataUpdate.MATNR_ARRBPTO_CCP;
					oServiceUpdate.param = {
						estcmap: oDataUpdate,
						p_user: "FGARCIA"
					};
					this._updateService(oServiceUpdate);
					break;
				default:
					oServiceUpdate.param = {
						data: "",
						fieldWhere: "CLSIS",
						flag: "",
						keyWhere: oDataUpdate["CLSIS"],
						opcion: aOpcion,
						p_case: "E",
						p_user: "FGARCIA",
						tabla: oServiceUpdate["TABLA"]
					};
					
					aKeys = Object.keys(oDataUpdate);
					aKeys.forEach(key=>{
						if(key !== "MANDT") aOpcion.push({field:key,valor:oDataUpdate[key]})
					});
					this._updateService(oServiceUpdate);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		 _onObjectMatched : function (oEvent) {
			this.removeControls();
			var sObjectId =  oEvent.getParameter("arguments").objectId;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getModel().dataLoaded().then( function() {
				// var sObjectPath = this.getModel().createKey("Categories", {
				// 	CategoryID :  sObjectId
				// });
				this._bindView("/listaConfig/" + sObjectId);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		 _bindView : function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			// oViewModel.setProperty("/busy", false);
            
			this.getView().bindElement({
                path : sObjectPath,
				events: {
					change : this._onBindingChange.bind(this),
					dataRequested : function () {
                        oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange : function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

            let oObject = oElementBinding.getBoundContext().getObject();

            if(!oObject){
                this.onCloseDetailPress();
                return;
            }
			if(oObject.IDAPP === "C01") this._getValidCoord();
			oObject.fields.sort((a,b)=>a.ORDENMEW - b.ORDENMEW);

            // carga de servicios iniciales
            let aServicesDom = oObject.services.filter(serv=>serv.TIPOPARAM === "DOMINIO"),
			aServicesHelp = oObject.searchHelp.filter(oServ=>oServ.IDAPP !== "B03"),
			aServiceTable = oObject.services.filter(serv=>serv.INITSERVICE === "TRUE" && serv.TIPOPARAM === "PARAM"),
			aServicePesca = oObject.services.filter(serv=>serv.INITSERVICE === "TRUE" && serv.TIPOPARAM === ""),
            aParams = [],
            oDominio,
            oDomService = {},
			oTableService = {},
			oModelMaster = this.getModel("DATOSMAESTRO");
			oTableService.param = {};
            oDomService.param = {},
			
			this.Count = 0;
			this.CountService = 0;
			if(aServicesHelp.length > 0) this.CountService = aServicesHelp.length;
			if(aServicesDom.length > 0 ) this.CountService = this.CountService + 1;
			if(aServiceTable.length > 0 ) this.CountService = this.CountService + 1;
			if(aServicePesca.length > 0 ) this.CountService = this.CountService + 1;

			// dominios
            if(aServicesDom.length > 0){
                BusyIndicator.show(0);
                aServicesDom.forEach(serv=>{
                    oDominio = {};
                    oDominio.domname = serv.DOMNAME;
                    oDominio.status = serv.STATUS_DOMNAME;
                    aParams.push(oDominio);
                    oDomService.PATH = serv.PATH;
                    oDomService.MODEL = serv.MODEL;
                });
                oDomService.param.dominios = aParams;
                this._getDataDominios(oDomService,oObject);
            };
            // ayudas de busqueda
			if(aServicesHelp.length > 0){
                aServicesHelp.forEach(oServ=>{
                    oServ.param = {};
                    oServ.param.nombreAyuda=oServ.TABLA
                    oServ.p_user = "FGARCIA";
                    this._getSearchingHelp(oServ,oObject);
                });
            };

			// Tabla principal
			if(aServiceTable.length > 0){
				aServiceTable.forEach(oServ => {
					oServ.param = {
						delimitador: oServ.DELIMITADOR,
						fields: [],
						no_data: oServ.NO_DATA,
						option: [],
						options: [],
						order: "",
						p_user: "FGARCIA",
						rowcount: oServ.ROWCOUNT_S,
						rowskips: oServ.ROWSKIPS,
						tabla: oServ.TABLA
					};
					oModelMaster.setProperty("/serviceBusqueda",oServ);
					// oTableService.MODEL = oServ.MODEL;
					// oTableService.PATH = oServ.PATH;
					this._getReadTable(oServ,oObject);
				});
			};

			// Servicios de pesca

			if(aServicePesca.length > 0){
				aServicePesca.forEach(oServ => {
					oServ.param = {
						p_user: "FGARCIA",
					};
					oModelMaster.setProperty("/serviceBusqueda",oServ);
					this._getReadTable(oServ,oObject);
				});
			};


			// header y content page
			this._buildHeaderContent(oObject);
			this._buildContent(oObject);
		},

		// getTitulos: function(data) { // Encontrar todos los títulos del archivo
		// 	let titulos = [];
		// 	let keys;
		// 	data.forEach(item => {
		// 		keys = Object.keys(item);
		// 		keys.forEach(key => {
		// 			if(!titulos.includes(key)){
		// 				titulos.push(key);
		// 			}
		// 		});
		// 	});

		// 	return titulos;
		// },

		_renderTableArchivos: function(aDataExcel) {
			let oModelMaster = this.getModel("DATOSMAESTRO");
			oModelMaster.setProperty("/listaArchivos", aDataExcel);

			let aData = [...aDataExcel];
			const titulos = aData.shift();

			oModelMaster.setProperty("/listaArchivosView", aData);

			let oContainerTable = this.mFragments["CargaTable"];

			var oTableArchivos = oContainerTable.getContent()[0];
			let cells = [];
			let cell;

			let keys = Object.keys(aDataExcel[0]);

			oTableArchivos.removeAllColumns();
			oTableArchivos.unbindItems()

			keys.forEach(key => {
				var aColumnArchivo = new sap.m.Column({
					header: new sap.m.Text({
						text: titulos[key]
					}),
					width: "8rem"
				});
				cell = new sap.m.Text({
					text: `{DATOSMAESTRO>${key}}`
				});
				cells.push(cell);
				oTableArchivos.addColumn(aColumnArchivo);
				
			});

			var aRowArchivo = new sap.m.ColumnListItem({
				cells: cells
			});
			oTableArchivos.bindItems({
				path: 'DATOSMAESTRO>/listaArchivosView',
				template: aRowArchivo
			});
		},
		_enviarData: async function(data, fileName){
			this.Count = 0;
			this.CountService = 1;
			let oModel = this.getModel(),
			sIdUp = oModel.getProperty("/idUploader"),
			sUrl = HOST + "/api/cargaarchivos/CargaDescargaArchivos",
			oBody={
				"i_accion": "C",
				"i_directorio": "/tasa/produce/archivos",
				"i_filename": fileName,
				"i_trama": data,
				"I_PROCESOBTP":"CRGCOMPPRD",
				"I_USER":"FGARCIA"
			},
			oSendFiles = await this.getDataService(sUrl,oBody);

			if(oSendFiles){
				var validador = oSendFiles.t_mensaje[0].DSMIN;	 
				sap.ui.getCore().byId(sIdUp).setValue("");
				if(validador === "Error en la carga"){
					MessageBox.error(oSendFiles.t_mensaje[0].DSMIN);
				}else{
					this._moveFile(oSendFiles.t_mensaje[0].DSMIN);
				}
			}else{
				MessageBox.error("Hubo un error en la carga, inténtelo nuevamente");
				sap.ui.getCore().byId(sIdUp).setValue("");
			}

		},
		_moveFile: async function(cadena){
			this.Count = 0;
			this.CountService = 1;
			var oBody={
				"p_change": "",
				"p_code": "1",
				"p_user": "FGARCIA",
				"p_valida": ""
			},
			sUrl = HOST + "/api/cargaarchivos/CargaArchivo",
			oDataMoveFile = await this.getDataService(sUrl,oBody);

			if (oDataMoveFile){
				MessageBox.success(cadena+"\n"+oDataMoveFile.mensaje);
			}
		},

		/**
		 * Generacion de contenido para el Header
		 * @param {*} object 
		 */
		 _buildHeaderContent: async function(oObject){
			let oControlHeader,
			oView = this.getView(),
			oDetailPage = oView.byId("detailPage"),
			sNameFrag;

			switch (oObject["IDAPP"]) {
				case "C02":
					sNameFrag = "cargaArchivos";
				case "C14":
					if(!sNameFrag) sNameFrag="Carga";
					oControlHeader = await Fragment.load({
						name:`com.tasa.config.fragments.${sNameFrag}.Form`,
						controller:this
					});
					oView.addDependent(oControlHeader);
					oDetailPage.addHeaderContent(oControlHeader);
					break;
				case "C05":
					let aFieldsForm =  oObject.fields.filter(oField => oField.CONTROLSEARCH);
					oControlHeader = this.buildFragments("Form");
					oControlHeader.buildForm(oObject,aFieldsForm);
					oDetailPage.addHeaderContent(oControlHeader.getControl());
					break;
				default:
					break;
			}
				
		},

		/**
		 * Generacion del contenido principal
		 * @param {*} object 
		 */
		_buildContent: async function(oObject){
			let oControlContent,
			oModelMaster = this.getModel("DATOSMAESTRO"),
			oModelView = this.getModel("detailView"),
			oDetailPage = this.getView().byId("detailPage"),
			oView = this.getView(),
			sNameFrag;

			this.mFragments = this.mFragments || {};
			// oModelMaster.setProperty("/visibleBtnNew", true);
			// sap.ui.getCore().byId("idBotonNuevo").setVisible(true);
			// let sNameFrag;

			switch (oObject["IDAPP"]) {
				case "C01":
					let currentDate = new Date();
					// startDateMonth = new Date(currentDate.getFullYear(),currentDate.getMonth());
					oControlContent = this.mFragments["Calendario"];
					if(!oControlContent) {
						oControlContent = this.buildCalendarioPesca("Calendario");
					}else{
						let oCalendar = oControlContent._oFragment.getAggregation('mainContent')[0],
						sStartDate = oCalendar.getStartDate(),
						oContext=oCalendar.getBindingContext();
						if(!oContext) oContext = this.getView().getBindingContext();
						let oMaster=oContext.getObject();
						this._getTemporadaPesca(oMaster,sStartDate);
						oCalendar.setStartDate(new Date());
					}
					
					oModelMaster.setProperty("/startDateInit",currentDate);
					oModelView.setProperty("/legendShown",false);
					oDetailPage.setContent(oControlContent.getControl());
					break;
				case "C14":
					sNameFrag = "Carga";
					oDetailPage.setShowFooter(true);
					oModelView.setProperty("/visibleBtnSave", true);
					oModelView.setProperty("/visibleBtnClean", true);
					oControlContent = this.mFragments[`${sNameFrag}Table`];
					if(!oControlContent){
						oControlContent = await Fragment.load({
						name:`com.tasa.config.fragments.${sNameFrag}.Table`,
							controller:this
						});
						oView.addDependent(oControlContent);
						this.mFragments[`${sNameFrag}Table`] = oControlContent;
					};
					oDetailPage.setContent(oControlContent);
					break;
				case "C03":
					sNameFrag = "controlCombus";
				case "C11":
					if(!sNameFrag) sNameFrag = "PreciosPesca";
					oControlContent = await Fragment.load({
						name:`com.tasa.config.fragments.${sNameFrag}.form`,
						controller:this
					});
					oView.addDependent(oControlContent);
					oDetailPage.setContent(oControlContent);
					oDetailPage.setShowFooter(true);
					oModelView.setProperty("/visibleBtnSave", true);
					oModelView.setProperty("/visibleBtnClean", false);
					break;
				case "C04":
					sNameFrag = "controlViveres";
				case "C09":
					let oVBox = new sap.m.VBox({});
					if(!sNameFrag) sNameFrag = "EventPesca";
					let oFormFragment = await Fragment.load({
						name:`com.tasa.config.fragments.${sNameFrag}.form`,
						controller:this
					});
					oVBox.addItem(oFormFragment);
					oView.addDependent(oVBox);
					oDetailPage.setContent(oVBox);
					oDetailPage.setShowFooter(true);
					oModelView.setProperty("/visibleBtnSave", true);
					oModelView.setProperty("/visibleBtnClean", false);
					break;
				case "C05":
				case "C07":
					let aFieldsTable = oObject.fields.filter(oField=>oField.CONTROLTABLE);
					// if(oObject["IDAPP"] === "C05") oModelMaster.setProperty("/visibleBtnNew", false);
					if(aFieldsTable.length > 0){
						oControlContent = this.buildFragments("Table");
						oControlContent.buildTable(oObject,aFieldsTable);
						// oControlContent.setItems(oObject);
					}
					oDetailPage.setContent(oControlContent.getControl());
					break;
				case "C09":
				case "C11":
					let aSearchFields = oObject.fields.filter(oField=>oField.CONTROLSEARCH);
					if(aSearchFields.length > 0){
						oControlContent = this.buildFragments("Form");
					}
					oDetailPage.setContent(oControlContent.getControl());
					break;
				default:
					break;
			};
			// this.getView().addDependent(oControlContent);
		},

		/**
		 * Genracion de Dialog Editar y nuevo
		 * @param {*} oMaestro 
		 * @param {*} oContextData 
		 */

		crearFormNuevo: async function(oContextData){
			let oModelMaster = this.getModel("DATOSMAESTRO"),
			sTitleDialog = "Nuevo registro",
			sPath = "/form";
			oModelMaster.setProperty(sPath,{});
			oModelMaster.setProperty("/caseUpdate","N");
			if(oContextData){
				sTitleDialog = "Editar registro";
				sPath = oContextData.getPath();
				oModelMaster.setProperty("/caseUpdate","E");
			}
			oModelMaster.setProperty("/titleDialogDistribFlota",sTitleDialog);
			if(!this.editDialogDistrib){
				this.editDialogDistrib = await Fragment.load({
					name:"com.tasa.config.fragments.DistribFlota.form",
					controller:this
				});
				this.getView().addDependent(this.editDialogDistrib);
			}
			this.editDialogDistrib.bindElement("DATOSMAESTRO>"+ sPath);
			this.editDialogDistrib.open();
		},

		removeControls:function(){
			let oView = this.getView(),
			oDetailPage = oView.byId("detailPage"),
			aHeaderContent = oDetailPage.getHeaderContent(),
			oContentPage = oDetailPage.getContent(),
			oModelMaster = this.getModel("DATOSMAESTRO");
			oDetailPage.setShowFooter(false);
			oModelMaster.setData({});
			if(aHeaderContent.length > 0){
				let aFormContainer,
				aFormElement;
				oDetailPage.removeAllHeaderContent();
				aHeaderContent.forEach(oContent=>{
					aFormContainer = oContent.removeAllFormContainers();
					aFormContainer.forEach(oFormContainer=>{
						aFormElement = oFormContainer.removeAllFormElements();
					});
					if(aFormElement.length > 0){
						aFormElement.forEach(oFormElement=>{
							oFormElement.removeAllFields();
						});
					}
				});
			}
			if(oContentPage){
				if(oContentPage.mAggregations.columns)
					oContentPage.removeAllColumns();
				oDetailPage.setContent();
			}
		},

		cleanForm:function(sParam1,sParam2){
			let oMaster,
			control;
			if(sParam2){
				oMaster=sParam1;
			}else{
				let oContext = sParam1.getSource().getBindingContext();
				oMaster = oContext.getObject();
			}
		   let aDataFields = oMaster.fields.filter(oField=>oField.CONTROLSEARCH);

		   aDataFields.forEach(oField=>{
			   control=this.mFields[oField.IDFIELD+"0"];
			   if(control){
				   if(oField.CONTROLSEARCH==="INPUT"||oField.CONTROLSEARCH==="INPUT/NUMERIC"){
					   control.setValue("");
				   }else if(oField.CONTROLSEARCH==="COMBOBOX"){
					   control.setSelectedKey("");
				   }else if(oField.CONTROLSEARCH==="DATE"){
					   control.setValue("");
				   }
				   if(oField.RANGE==="TRUE"){
					   control=this.mFields[oField.IDFIELD+"1"];
					   if(control) control.setValue("");
				   }
				   if(oField.IDFIELD==="ROWCOUNT")
					   control.setValue(100);
			   }
		   });
		   BusyIndicator.hide();
		},

		onSeletedRow:function(oEvent){
			let oRowSelection = oEvent.getParameter();
		},

		cargaDinamicaArchivos: async function(listDataArchivos) {
			let oModelMaestro = this.getModel("DATOSMAESTRO");
			let tipoCarga = oModelMaestro.getProperty("/tipoCarga");
			
			let oContainerTable = this.mFragments["CargaTable"];
			var oTableArchivos = oContainerTable.getContent()[0];

			if (tipoCarga) {
				let result = await fetch(`${HOST}/api/cargaarchivos/CargaDinamicaArchivos/`,{
					method: "POST",
					body: JSON.stringify({
						ip_tpcarga: tipoCarga,
						listData: listDataArchivos
					})
				})
				.then(response => response.json())
				.then(data => data);

				if(result.mensaje === "Ok") {
					oTableArchivos.removeAllColumns();
					oTableArchivos.unbindItems();
					const mensaje = result.t_mensaje[0];
					MessageBox.success(mensaje.DSMIN);
				} else {
					MessageBox.error(result.mensaje);
				}

				oModelMaestro.setProperty("/tipoCarga", undefined);
				oModelMaestro.setProperty("/listaArchivos", []);
				oModelMaestro.setProperty("/listaArchivosView", []);
			} else {
				MessageBox.error("Debe seleccionar un tipo de carga");
			}
		},

		 /**
          * Consumiendo servicios
          * @param {*} oModel 
          */
		 _getReadTable: async function(service){
			let oModel = this.getModel(service.MODEL),
			sUrl = HOST + service.PATH,
			aDatatable = await this.getDataService(sUrl, service.param);
			
			if(aDatatable){
				let aData = aDatatable.data;
				if(!aData) aData = aDatatable.st_cmap;
				oModel.setProperty(service.PROPERTY,aData);
			}
	     },

		_getDataDominios: async function(service,oMaster){
            let oModelMaster = this.getModel(service.MODEL),
            sUrl = HOST + service.PATH,
            oGetDominios = await this.getDataService(sUrl, service.param);

            if(oGetDominios){
                let aServicesDom = oMaster.services.filter(serv=>serv.TIPOPARAM === "DOMINIO");
                aServicesDom.forEach(serv=>{
                    oGetDominios.data.forEach(dom=>{
                        if(serv.DOMNAME === dom.dominio)
                            oModelMaster.setProperty(`/${serv.IDSERVICE}`,dom.data);
                    });
                });
            }
        },
	    _getSearchingHelp: async function(service,oObject){
			let oModelService = this.getModel(service.MODEL),
			oModel = this.getModel(),
			sUrl = HOST + service.PATH,
			oGetSearchingHelp = await this.getDataService(sUrl, service.param);
			
			if(oGetSearchingHelp){
				let oDataFields = oModel.getProperty("/helpFieldList"),
				aFieldsName = oDataFields.filter(oField=>oField.IDAPP === service.IDAPP);
				aFieldsName.sort((a,b)=>a.ORDENMEW - b.ORDENMEW);
				oModelService.setProperty(`/${service.IDAPP}`,oGetSearchingHelp.data);
				oModelService.setProperty(`/name${service.IDAPP}`,aFieldsName);
			}
		},

		/**
		 * Calendario de temporada
		 * @param {*} oObject 
		 * @param {*} sStartDate 
		 */
		_getTemporadaPesca:function(oObject,sStartDate){
			let oModelConfig = this.getModel("DATOSMAESTRO"),
			sUrl = HOST+"/api/General/ConsultaGeneral/",
			dateIn = new Date(sStartDate.getFullYear(),sStartDate.getMonth(),1),
			dateOut = new Date(sStartDate.getFullYear(),sStartDate.getMonth(),32),
			sStartDateFormat = this.paramDate(dateIn),
			sEndDateFormat = this.paramDate(dateOut),
			oBody={
				nombreConsulta: "CONSGENCLDRTEMPFECHA",
				p_user: "FGARCIA",
				parametro1: sStartDateFormat,
				parametro2: sEndDateFormat,
				parametro3: "",
				parametro4: "",
				parametro5: ""
			},
			oDataTemporadaPesca = this.getDataService(sUrl, oBody);

			oDataTemporadaPesca
			.then(data=>{
				let aCalendarData = data.data,
				aTipPesca = new Array,
				aSpecialDate = new Array,
				aTipPescaCHI = new Array,
				aTipPescaCHD = new Array,
				aTipPescaVeda = new Array,
				oSpecialDate = new Object;

				aCalendarData.forEach((item)=>{
					item.startDate=this.setObjectDate(item.FHCAL),
					item.endDate=item.startDate;
					// propiedades para Special Dates
					oSpecialDate = {}
					oSpecialDate.startDate=item.startDate;
					oSpecialDate.endDate=item.startDate;
					oSpecialDate.type="Type02";
					// oSpecialDate.secondaryType="NonWorking"
					aSpecialDate.push(oSpecialDate);

					// calsificamos por typo de pesca
					if(item.CDTPC==="I") {
						item.type = "Type01"
						aTipPescaCHI.push(item);
					};
					if(item.CDTPC==="D") {
						item.type = "Type07"
						aTipPescaCHD.push(item)
					};
					if(item.CDTPC==="V") {
						item.type = "Type10"
						aTipPescaVeda.push(item)
					};
				});

				aTipPesca = [
					{
						idTipPesca:"I",
						name:"CHI",
						desc:"CONSUMO HUMANO INDIRECTO",
						appointments:aTipPescaCHI
					},
					{
						idTipPesca:"D",
						name:"CHD",
						desc:"CONSUMO HUMANO DIRECTO",
						appointments:aTipPescaCHD
					},
					{
						idTipPesca:"V",
						name:"VEDA",
						desc:"TEMPORADA DE VEDA",
						appointments:aTipPescaVeda
					}
				];

				// let aDataAppointment=data.data.map(item=>{
				// 	// item.title=item.CDTPC;
				// 	// item.text=item.DSSPC;
				// 	item.type="Type07";
				// 	item.icon="sap-icon://accept",
				// 	item.startDate=this.setObjectDate(item.FHCAL),
				// 	item.endDate=item.startDate;
				// 	return item;
				// });
				// let aServicesDom=oObject.services.filter(serv=>serv.TIPOPARAM==="DOMINIO"),
				// aDataDom;
				// aDataAppointment.forEach(item=>{
				// 	aServicesDom.forEach(serv=>{
				// 		if(item[serv?.IDSERVICE]){
				// 			aDataDom=oModelConfig.getProperty(`/${serv.IDSERVICE}`);
				// 			aDataDom?.forEach(dom=>{
				// 				if(dom.id===item[serv.IDSERVICE])
				// 					item[serv.IDSERVICE]=dom.descripcion;
				// 			})
				// 		}
				// 	})
				// })
				oModelConfig.setProperty("/tipoPesca",aTipPesca);
				oModelConfig.setProperty("/specialDates",aSpecialDate);
				oModelConfig.setProperty("/startDateInit",sStartDate);
				oModelConfig.setProperty("/datosCalendarios",aCalendarData);
				oModelConfig.refresh(true);

				// deshabilita Boton agregar temporada
				let oModelView = this.getModel("detailView");
				oModelView.setProperty("/visibleButtonAdd",false)
				oModelView.setProperty("/visibleButtonEnable",true)
				BusyIndicator.hide();
			})
			.catch();
		},

		_getValidCoord:function(){
			let oModelConfig = this.getModel("DATOSMAESTRO"),
			sUrl = HOST+"/api/General/ConsultaGeneral/",
			oBody={
				nombreConsulta: "CONSGENCONSTLAT",
				p_user: "FGARCIA",
				parametro1: "",
				parametro2: "",
				parametro3: "",
				parametro4: "",
				parametro5: ""
			},
			oDataValidacion = this.getDataService(sUrl, oBody);

			oDataValidacion
			.then(data=>{
				oModelConfig.setProperty("/validaciones",data.data);
			})
			.catch(error=>{
				console.log(error);
			})

		},
		_saveTemporadaPesca:function(oObject,oBody,oDate){
			let sUrl = HOST+"/api/calendariotemporadapesca/Guardar",
			oDataSaved = this.getDataService(sUrl,oBody);

			oDataSaved
			.then(data=>{
				let sMessage = data.t_mensaje[0].DSMIN;
				this.getMessageDialog("Success", sMessage);
				this._getTemporadaPesca(oObject,oDate)
			})
			.catch(error=>{
				console.log(error)
			})
		},
		_eliminarTemporadaPesca:function(oObject,oBody,oDate){
			let sUrl = HOST+"/api/calendariotemporadapesca/Eliminar",
			oData = this.getDataService(sUrl,oBody);

			oData.then(data=>{
				let sMessage="error"
				if(data.t_mensaje) sMessage = data.t_mensaje[0].DSMIN;
				this.getMessageDialog("Success", sMessage);
				this._getTemporadaPesca(oObject,oDate)
			})
			.catch(error=>{
				console.log(error)
			})
		},

		/**
		 * Update services
		 * @param {*} oService 
		 * @param {*} oMaster 
		 */
		_updateService: async function(oService){
			let sUrl = HOST+oService.PATH,
			oModelMaster = this.getModel(oService.MODEL),
			oUpdateData = await this.getDataService(sUrl,oService.param);
			if(oUpdateData){
				// let sMessage = oUpdateData.t_mensaje[0].DSMIN;
				let sMessage = oUpdateData.mensaje;
				this.getMessageDialog("Success",sMessage);
				let oSearchService = oModelMaster.getProperty("/serviceBusqueda");
				this._getReadTable(oSearchService);
			}else{
				this.getMessageDialog("Error","No se pudo guardar");
			}
		},

		 /**
		  *  Serivicio para consumir detalle de app Impr. Vale de Viveres
		  * @param {object} oService 
		  */
		 getDetalleImprValeViveres:function(oService,){
			let sUrl = HOST+oService.PATH,
			getDetail = this.getDataService(sUrl,oService.param),
			oModelMaster=this.getModel(oService.MODEL);
			getDetail
			.then(data=>{
				BusyIndicator.hide();
				// let sMessage = data.t_mensaje[0]?.DSMIN;
				// this.getMessageDialog("Success",sMessage);
				oModelMaster.setProperty("/detailVale",data.s_posicion);
			})
			.catch(error=>{
				console.log(error)
			})
		 },

		 _getDataControlComb:function(){
			 let sUrl = HOST + "/api/General/Read_Table/",
			 oModelMaster = this.getModel("DATOSMAESTRO"),
			 param = {
				"delimitador": "|",
				"fields": ["CLSIS","INEIF","BWART","MATNR","WERKS","CDUMD"],
				"no_data": "",
				"option": [],
				"options": [
				    // {
					// 	"cantidad": "",
					// 	"control": "INPUT",
					// 	"key": "CLSIS",
					// 	"valueHigh": "",
					// 	"valueLow": "01"
					// },
					// {
					// 	"cantidad": "",
					// 	"control": "COMBOBOX",
					// 	"key": "INEIF",
					// 	"valueHigh": "",
					// 	"valueLow": "N"
					// },
					// {
					// 	"cantidad": "",
					// 	"control": "string",
					// 	"key": "BWART",
					// 	"valueHigh": "",
					// 	"valueLow": "003"
					// }
				],
				"order": "",
				"p_user": "FGARCIA",
				"rowcount": 0,
				"rowskips": 0,
				"tabla": "ZFLCCC"
			},
			aDatatable = this.getDataService(sUrl, param);
			aDatatable
			.then(data=>{
				BusyIndicator.hide();
				oModelMaster.setProperty("/listaControlComb",data.data[0])
			})
		 }
	});

});