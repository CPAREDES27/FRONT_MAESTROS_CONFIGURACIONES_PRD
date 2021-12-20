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
	"../lib/xlsx"
], function (
		BaseController, 
		JSONModel, 
		formatter, 
		mobileLibrary,
		BusyIndicator,
		Fragment,
		MessageBox,
		jszip,
		xlsxjs) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	const HOST = "https://cf-nodejs-qas.cfapps.us10.hana.ondemand.com";
	var oGlobalBusyDialog = new sap.m.BusyDialog();

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

			// this.getOwnerComponent().getModel().dataLoaded().then(this._onMetadataLoaded.bind(this));

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

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		handleSelectFile: function (oEvent) {
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
            // console.log(this.mimeDet , this.fileName, this.fileDetails);
            } else {
             sap.ui.getCore().fileUploadArr = [];
            }
        },

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
					console.log(aData);

					// Generación dinámica
					//Generar tabla
					that.renderTableArchivos(aData);
					
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
		getTitulos: function(data) { // Encontrar todos los títulos del archivo
			let titulos = [];
			let keys;
			data.forEach(item => {
				keys = Object.keys(item);
				keys.forEach(key => {
					if(!titulos.includes(key)){
						titulos.push(key);
					}
				});
			});

			return titulos;
		},
		renderTableArchivos: function(aDataExcel) {
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
		enviarData: function(data, fileName){
			let oModel = this.getModel(),
			sIdUp = oModel.getProperty("/idUploader");
			oGlobalBusyDialog.open();
			var body={
				"i_accion": "C",
				"i_directorio": "/tasa/produce/archivos",
				"i_filename": fileName,
				"i_trama": data,
				"I_PROCESOBTP":"CRGCOMPPRD",
				"I_USER":"FGARCIA"
			}
			// console.log(body);
			fetch(`${HOST}/api/cargaarchivos/CargaDescargaArchivos`,
					  {
						  method: 'POST',
						  body: JSON.stringify(body)
					  })
					  .then(resp => resp.json()).then(data => {
						//   console.log(data);
						//  console.log(data.t_mensaje[0].DSMIN);
						 var validador = data.t_mensaje[0].DSMIN;
						 
						 sap.ui.getCore().byId(sIdUp).setValue("");
						 if(data.t_mensaje[0].DSMIN === "Error en la carga"){
							 oGlobalBusyDialog.close();
							 MessageBox.error(data.t_mensaje[0].DSMIN);
						 }else{
							this.moveFile(data.t_mensaje[0].DSMIN);
						 }
						 
					  }).catch(error => {
						  oGlobalBusyDialog.close();
						  MessageBox.error("Hubo un error en la carga, inténtelo nuevamente");
						  sap.ui.getCore().byId(sIdUp).setValue("");
					  }
				);

		},
		moveFile: function(cadena){
			oGlobalBusyDialog.open();
			var body={
				"p_change": "",
				"p_code": "1",
				"p_user": "FGARCIA",
				"p_valida": ""
			};

			fetch(`${HOST}/api/cargaarchivos/CargaArchivo`,
					{
						  method: 'POST',
						  body: JSON.stringify(body)
					})
					  .then(resp => resp.json()).then(data => {
						
						MessageBox.success(cadena+"\n"+data.mensaje);
						oGlobalBusyDialog.close();
					}).catch(error => {
						MessageBox.error("Hubo un error en la carga, inténtelo nuevamente");
						oGlobalBusyDialog.close();
					}
			);
		},
		base64coonversionMethod: function () {
			var self=this;
			var dataFinal=null;
			var fileMime = this.mimeDet;
			var fileName = this.fileName;
			var fileDetails = this.fileDetails;
			var DocNum = "001";
			// console.log(fileMime,fileName,fileDetails);
			var that = this;
			if (!FileReader.prototype.readAsBinaryString) {
			 FileReader.prototype.readAsBinaryString = function (fileData) {
			  var binary = "";
			  var reader = new FileReader();
			  reader.onload = function (e) {
			   var bytes = new Uint8Array(reader.result);
			   var length = bytes.byteLength;
			   for (var i = 0; i < length; i++) {
				binary += String.fromCharCode(bytes[i]);
			   }
			   that.base64ConversionRes = btoa(binary);
			   console.log("hola "+base64ConversionRes);
			   sap.ui.getCore().fileUploadArr.push({
				"DocumentType": DocNum,
				"MimeType": fileMime,
				"FileName": fileName,
				"Content": that.base64ConversionRes,
			   });
			  };
			 
			  reader.readAsArrayBuffer(fileData);
			 };
			}
			var base=null;
			var reader = new FileReader();
			reader.onload = function (readerEvt) {
				// console.log(readerEvt);
				var binaryString = readerEvt.target.result;
				that.base64ConversionRes = btoa(binaryString);
				dataFinal=btoa(binaryString);
			
				self.enviarData(dataFinal,fileName);
				
			};
			
			if(!fileDetails){
				MessageBox.error("Debe cargar un archivo antes de enviar");
			}
			this.fileDetails=null;
			reader.readAsBinaryString(fileDetails);
			
		   },

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
			
			
            // oContext = oView.getBindingContext()
            // if(oContext) oObject = oContext.getObject();
            // if(!oContext) return;
            // // Llamar a dominio 
			// this.loadControls();

			// if(!oObject){
            //     this.onCloseDetailPress();
            //     return;
            // }
            // oObject.fields.sort((a,b)=>a.ORDENMEW-b.ORDENMEW);

			// let aServicesHelp = oObject.searchHelp.filter(oServ=>oServ.IDAPP!=="B03");
			// this.cantServ = aServicesHelp.length,
            // this.count = 0;
            // this.countService = 2;
			// if(aServicesHelp.length>0){
            //     BusyIndicator.show(0);
            //     aServicesHelp.forEach(oServ=>{
            //         oServ.param={};
            //         oServ.param.nombreAyuda=oServ.TABLA
            //         oServ.p_user = "FGARCIA";
            //         this._getSearchingHelp(oServ,oObject);
            //     })
            // }else{
			// 	if(oObject["IDAPP"]==="C04"){
			// 		this.buildContent(oObject);
			// 	}else if(oObject["IDAPP"]==="C03"){
			// 		let services = {},
			// 		oParam = {
			// 			dominios:[
			// 				{
			// 					"domname":"ZINEIF",
			// 					"status":"A"
			// 				}
			// 			]
			// 		};
			// 		services.param = oParam;
			// 		services.PATH = "/api/dominios/Listar";
			// 		services.MODEL = "DATOSMAESTRO";
			// 		this._getDataDominios(services,oObject);
			// 		this.buildContent(oObject);
			// 		this._getDataControlComb();

			// 	}else if(oObject["IDAPP"]==="C02"||oObject["IDAPP"]==="C14"){
			// 		this.buildHeaderContent(oObject);
			// 		this.buildContent(oObject);
			// 	}else{
			// 		let oFieldsSearch = oObject.fields.filter(oField=>oField.CONTROLSEARCH);
			// 		if(oFieldsSearch.length>0)
			// 			this.buildHeaderContent(oObject);
			// 		this.buildContent(oObject);
			// 	}
			// }

			// let aServicesDom = oObject.services.filter(serv=>serv.TIPOPARAM==="DOMINIO"),
			// aParams=[],
			// oService={};
			// oService.param={};
			// if(aServicesDom.length>0){
			// 	BusyIndicator.show(0);
			// 	aServicesDom.forEach(serv=>{
			// 		let oDominio={};
			// 		oDominio.domname=serv.DOMNAME;
			// 		oDominio.status=serv.STATUS_DOMNAME;
			// 		aParams.push(oDominio);
			// 		oService.PATH=serv.PATH;
			// 		oService.MODEL=serv.MODEL;
			// 	});
			// 	oService.param.dominios=aParams;
			// 	this._getDataDominios(oService,oObject);
			// }else{
			// 	let oServiceTable = oObject.services.find(serv=>serv.IDSERVICE==="TABLE");
			// 	if(oServiceTable){
            //         oServiceTable.param = {};
            //         oServiceTable.param.delimitador=oServiceTable.DELIMITADOR;
            //         oServiceTable.param.fields=[];
            //         oServiceTable.param.no_data=oServiceTable.NO_DATA;
            //         oServiceTable.param.option=[];
            //         oServiceTable.param.options=[];
            //         oServiceTable.param.order=oServiceTable.ORDER_S;
            //         oServiceTable.param.p_user="FGARCIA";
            //         oServiceTable.param.rowcount=oServiceTable.ROWCOUNT_S;
            //         oServiceTable.param.rowskips=oServiceTable.ROWSKIPS;
            //         oServiceTable.param.tabla=oServiceTable.TABLA;
            //         this._getReadTable(oServiceTable,oObject);
			// 	}
			// }
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
            aParams = [],
            oDominio,
            oDomService = {},
			oTableService = {};
			oTableService.param = {};
            oDomService.param = {};
			
			this.Count = 0;
			this.CountService = 0;
			if(aServicesHelp.length > 0) this.CountService = aServicesHelp.length;
			if(aServicesDom.length > 0 ) this.CountService = this.CountService + 1;
			if(aServiceTable.length > 0 ) this.CountService = this.CountService + 1;

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
					oTableService.param = {
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
					oTableService.MODEL = oServ.MODEL;
					oTableService.PATH = oServ.PATH;
					this._getReadTable(oTableService,oObject);
				});
			}

			// header y content page
			this._buildHeaderContent(oObject);
			this._buildContent(oObject);
		},

		_onMetadataLoaded : function () {
			// Store original busy indicator delay for the detail view
			// var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
			// 	oViewModel = this.getModel("detailView"),
			// 	oLineItemTable = this.byId("lineItemsList"),
			// 	iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// // Make sure busy indicator is displayed immediately when
			// // detail view is displayed for the first time
			// oViewModel.setProperty("/delay", 0);
			// oViewModel.setProperty("/lineItemTableDelay", 0);

			// oLineItemTable.attachEventOnce("updateFinished", function() {
			// 	// Restore original busy indicator delay for line item table
			// 	oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			// });

			// // Binding the view will set it to not busy - so the view is always busy if it is not bound
			// oViewModel.setProperty("/busy", true);
			// // Restore original busy indicator delay for the detail view
			// oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
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
		 * Generacion de contenido para el Header
		 * @param {*} object 
		 */
		 _buildHeaderContent: async function(oObject){
			let oControlHeader,
			oDetailPage = this.getView().byId("detailPage");

			if(oObject["IDAPP"] === "C02" || oObject["IDAPP"] === "C14"){
				let sNameFrag ;
				if(oObject["IDAPP"] === "C02") sNameFrag = "cargaArchivos";
				if(oObject["IDAPP"] === "C14") sNameFrag="Carga";
				oControlHeader = await Fragment.load({
                    name:`com.tasa.config.fragments.${sNameFrag}.Form`,
                    controller:this
                });
                
				oDetailPage.addHeaderContent(oControlHeader);
				
			}else if( oObject["IDAPP"] === "C05" ){

				let aFieldsForm =  oObject.fields.filter(oField => oField.CONTROLSEARCH);
				oControlHeader = this.buildFragments("Form");
				oControlHeader.buildForm(oObject,aFieldsForm);
				oDetailPage.addHeaderContent(oControlHeader.getControl());
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
			oDetailPage = this.getView().byId("detailPage");

			this.mFragments = this.mFragments || {};

			if(oObject["IDAPP"] === "C01"){
				let currentDate = new Date(),
				startDateMonth = new Date(currentDate.getFullYear(),currentDate.getMonth());
				this.mFragments = this.mFragments || {};
				oControlContent = this.mFragments["Calendario"];
				if(!oControlContent) oControlContent = this.buildCalendarioPesca("Calendario");
				oModelMaster.setProperty("/startDateInit",currentDate);
				oModelView.setProperty("/legendShown",false);
				oDetailPage.setContent(oControlContent.getControl());
			} else if (/*oObject["IDAPP"] === "C02" || */oObject["IDAPP"] === "C14" ){
				let sNameFrag;
				if(oObject["IDAPP"] === "C02") sNameFrag = "cargaArchivos";
				if(oObject["IDAPP"] === "C14") {
					sNameFrag = "Carga";
					oDetailPage.setShowFooter(true);
					oModelView.setProperty("/visibleBtnSave", true);
					oModelView.setProperty("/visibleBtnClean", true);
				};
				
				let oControlContent = this.mFragments[`${sNameFrag}Table`];
				if(!oControlContent){
					oControlContent = await Fragment.load({
					name:`com.tasa.config.fragments.${sNameFrag}.Table`,
						controller:this
					});
					this.getView().addDependent(oControlContent);
					this.mFragments[`${sNameFrag}Table`] = oControlContent;
				};

                oDetailPage.setContent(oControlContent);
			
			} else if (oObject["IDAPP"] === "C03"){
				oControlContent = await Fragment.load({
                    name:`com.tasa.config.fragments.controlCombus.form`,
                    controller:this
                });
                oDetailPage.setContent(oControlContent);

			} else if (oObject["IDAPP"] === "C04"){
				let oVBox = new sap.m.VBox({});
				let oFormFragment = await Fragment.load({
					name:"com.tasa.config.fragments.controlViveres.form",
					controller:this
				});
				oVBox.addItem(oFormFragment);
				oDetailPage.setContent(oVBox);
				oDetailPage.setShowFooter(true);
				oModelView.setProperty("/visibleBtnSave", true);
				oModelView.setProperty("/visibleBtnClean", false);
			}else if(oObject["IDAPP"] === "C05" || oObject["IDAPP"] === "C07"){
				let aFieldsTable = oObject.fields.filter(oField=>oField.CONTROLTABLE);
				if(aFieldsTable.length > 0){
					oControlContent = this.buildFragments("Table");
					oControlContent.buildTable(oObject,aFieldsTable);
					oControlContent.setItems(oObject);
				}
				oDetailPage.setContent(oControlContent.getControl());
				
			} else if (oObject["IDAPP"] === "C09" || oObject["IDAPP"] === "C11"){
				let aSearchFields = oObject.fields.filter(oField=>oField.CONTROLSEARCH);
				if(aSearchFields.length > 0){
					oControlContent = this.buildFragments("Form");
					// oControlContent.setTitle("Ingresar datos");
				}
				oDetailPage.setContent(oControlContent.getControl());
			}
		},

		removeControls:function(){
			let oView = this.getView(),
			oDetailPage = oView.byId("detailPage"),
			aHeaderContent = oDetailPage.getHeaderContent(),
			oContentPage = oDetailPage.getContent();
			oDetailPage.setShowFooter(false);
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

		onSuggestionItemSelected:function(oEvent){
			let oRow = oEvent.getParameter("selectedRow"),
			oInput = oEvent.getSource(),
			oValue=oRow.getCells()[1].getText();
			oInput.setDescription(oValue);
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

				console.log(result);

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
		 * Evento del footer de la pagina
		 */
		onGuardar:function(oEvent){
			// BusyIndicator.show(0)
			// let oContext = oEvent.getSource().getBindingContext(),
			// oMaster = oContext.getObject(),
			// oServiceUpdate = oMaster.services.find(oServ=>oServ.IDSERVICE==="UPDATE"),
			// oModelMaster = this.getModel("DATOSMAESTRO"),
			// aDataUpdate = oModelMaster.getProperty("/LISTACONTROLDEVIVERES"),
			// aOpcion=[],
			// aKeys=[],
			// oFieldExist,
			// sFieldWhere,
			// sKeyWhere;

			// switch(oMaster.IDAPP) {
			// 	case "C14":
			// 		let aDataListaArchivos = oModelMaster.getProperty("/listaArchivos");
			// 		if(aDataListaArchivos && aDataListaArchivos.length > 0){
			// 			this.cargaDinamicaArchivos(aDataListaArchivos);
			// 		}
			// 		break;
			// 	case "C04":
			// 		aDataUpdate.forEach(item=>{
			// 			aKeys = Object.keys(item)
			// 			oMaster.fields.forEach(oField=>{
			// 				oFieldExist = aKeys.find(key=>key===oField.IDFIELD)
			// 				if(oFieldExist){
			// 					aOpcion.push({
			// 						field:oField.IDFIELD,
			// 						valor:item[oField.IDFIELD]
			// 					})
			// 				}
			// 				if(oField.ORDENMEW===1){
			// 					sFieldWhere=oField.IDFIELD;
			// 					sKeyWhere=item[oField.IDFIELD]
			// 				}
			// 			})
			// 		})
			// 		// oModelMaster.getProperty("/")
			// 		oServiceUpdate.param={
			// 			data:"",
			// 			fieldWhere:sFieldWhere,
			// 			keyWhere:sKeyWhere,
			// 			flag:"X",
			// 			opcion:aOpcion,
			// 			p_case:"E",
			// 			p_user:"FGARCIA",
			// 			tabla:oServiceUpdate.TABLA
			// 		}
					
			// 		this._updateService(oServiceUpdate);
			// 		break;
			// }
			
			// BusyIndicator.hide();
		},

		 /**
          * Consumiendo servicios
          * @param {*} oModel 
          */
		 _getReadTable: async function(service,oMaster){
			let oModel = this.getModel(service.MODEL),
			sUrl = HOST + service.PATH,
			aDatatable = await this.getDataService(sUrl, service.param);
			
			if(aDatatable){
				oModel.setProperty(service.PROPERTY,aDatatable.data);
			}
			// .then(data=>{
			//    aData = data.data;
			//    if(aData.length>0){
			// 	   let aServicesDom=oMaster.services.filter(serv=>serv.TIPOPARAM==="DOMINIO"),
			// 	   aDataDom;
			// 	   aData.forEach(item=>{
			// 		   aServicesDom.forEach(serv=>{
			// 			   if(item[serv?.IDSERVICE]){
			// 				   aDataDom=oModel.getProperty(`/${serv.IDSERVICE}`);
			// 				   aDataDom?.forEach(dom=>{
			// 					   if(dom.id===item[serv.IDSERVICE])
			// 						   item[serv.IDSERVICE]=dom.descripcion;
			// 				   })
			// 			   }
			// 		   })
			// 	   })
			// 	//    oModel.setProperty("/cantData",aData.length)
			//    }else{
			// 		this.getMessageDialog("Information", "No existen registros para la búsqueda");
			// 		oModel.setProperty(service.PROPERTY,[])
			//    }
			//    BusyIndicator.hide();
		    // })
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
                // let aServices = oMaster.services.filter(serv=>serv.INITSERVICE==="TRUE"&&serv.TIPOPARAM==="PARAM");
                // if(aServices.length>0){
                //     aServices.forEach(serv=>{
                //         serv.param={};
                //         serv.param={};
                //         serv.param.delimitador=serv.DELIMITADOR;
                //         serv.param.fields=[];
                //         serv.param.no_data=serv.NO_DATA;
                //         serv.param.option=[];
                //         serv.param.options=[];
                //         serv.param.order="";
                //         serv.param.p_user="FGARCIA";
                //         serv.param.rowcount=serv.ROWCOUNT_S;
                //         serv.param.rowskips=serv.ROWSKIPS;
                //         serv.param.tabla=serv.TABLA;
                //         this._getReadTable(serv,oMaster);
                //     });
                    
                // }
                // if(oMaster.IDAPP==="C01"){
                //     let oDate = new Date;
                //     // this._getTemporadaPesca(oMaster,oDate);
                // }
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
				// if(this.cantServ === this.iFlag){
				// 	if(oObject["IDAPP"]==="C01"||oObject["IDAPP"]==="C04"){
				// 		this.buildContent(oObject);
				// 	}else{
				// 		this.buildHeaderContent(oObject);
				// 		this.buildContent(oObject);
				// 	}
			}
		},
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

		_updateService:function(oService,oMaster){
			let sUrl = HOST+oService.PATH,
			oModelMaster = this.getModel(oService.MODEL),
			oUpdateData = this.getDataService(sUrl,oService.param);
			oUpdateData
			.then(data=>{
				// BusyIndicator.hide();
				let sMessage = data.t_mensaje[0].DSMIN;
				this.getMessageDialog("Success",sMessage);
				let oSearchService = oModelMaster.getProperty("/serviceBusqueda");
				this._getReadTable(oSearchService,oMaster);
			})
			.catch(error=>{
				console.log(error)
			})
		},
		/**
		 *  Servicio para consumir la ayuda de busqueda
		 * @param {object} oService 
		 */
		getDataSearchHelp:function(oService){
            let sUrl = HOST+oService.PATH,
            oModelMaster = this.getModel(oService.MODEL),
             oDataUpdate=this.getDataService(sUrl, oService.param);
             oDataUpdate
             .then(data=>{
                oModelMaster.setProperty("/dataEmbarcaciones",data);
                oModelMaster.setProperty("/pageTable",{
                    text:`Página ${oService.param.p_pag} de ${data.p_totalpag}`,
                    page:oService.param.p_pag
                });
                 BusyIndicator.hide();
                // this.mFragments["NewMaster"].getControl().close();
                // this.getMessageDialog("Success",data.dsmin);
             })
			 .catch(error=>{
				 console.log(error);
			 })
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
		 },

		 onSaveControlCombus:function(){
			BusyIndicator.show(0);
			let oModelMaster = this.getModel("DATOSMAESTRO"),
			sUrl = HOST + "/api/General/Update_Table/",
			oDataForm = oModelMaster.getProperty("/listaControlComb"),
			sData = `|${oDataForm["CLSIS"]}|${oDataForm["INEIF"]}|${oDataForm["BWART"]}|${oDataForm["MATNR"]}|${oDataForm["WERKS"]}|${oDataForm["CDUMD"]}`,
			param = {
				data: sData,
				flag: "",
				p_case: "E",
				p_user: "FGARCIA",
				tabla: "ZFLCCC"
			  },
			  oUpdateData = this.getDataService(sUrl,param);

			  oUpdateData
			  .then(data=>{
				this.getMessageDialog("Success",data.t_mensaje[0].DSMIN);
				BusyIndicator.hide();
			  })
		 }
	});

});