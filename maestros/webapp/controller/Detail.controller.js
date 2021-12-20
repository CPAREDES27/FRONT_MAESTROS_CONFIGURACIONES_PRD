sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/core/Fragment",
    "sap/m/library",
    "sap/ui/core/BusyIndicator",
    "./Fragments",
    "./ItemsTab",
	"./embarcaciones/embarcaciones"
], function (BaseController,
    JSONModel,
    formatter,
    Fragment,
    mobileLibrary,
    BusyIndicator,
    Fragments,
    ItemsTab,
    Embarcaciones) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

    const HOST = "https://cf-nodejs-qas.cfapps.us10.hana.ondemand.com";

	return BaseController.extend("com.tasa.maestros.controller.Detail", {

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

			this.getOwnerComponent().getModel().dataLoaded().then(this._onMetadataLoaded.bind(this));

			// Custom
			this.crearFragments("BusquedaBasica");
            // Creacion de tabla de Registro
            this.crearFragments("Tabla");

            // creamos contenedor de controles
            this.mFields={};
            this.mSearchFields={};
            this.mFragEdit = {};
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
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
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

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {

			//elimanos controles de datos de selecion previos
            this.removeControls();

			var sObjectId =  oEvent.getParameter("arguments").objectId;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getModel().dataLoaded().then( function() {
				// var sObjectPath = this.getModel().createKey("Categories", {
				// 	CategoryID :  sObjectId
				// });
				this._bindView("/listaMaestros/" + sObjectId);
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
            const oView=this.getView();
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

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

			let oObject = oView.getBindingContext().getObject();
            if(!oObject){
                this.onCloseDetailPress();
                BusyIndicator.hide();
                return;
            }
            let oNewButton = oView.byId("idBotonNuevo");
            oNewButton.setText("Nuevo")
            if(oObject["IDAPP"]==="M22"){
                oNewButton.setText("Carga masiva");
            }

            oObject.fields.sort((a,b)=>a.ORDENMEW-b.ORDENMEW);
            oView.getContent()[0].setTitleHeading(new sap.m.Title({
                text:oObject.DESCAPP,
                level:"H2"
            }));

            // Llamamos al servicio de ayudas de busqueda
            let aSearchhelp = oObject.searchHelp.filter(oSearch=>oSearch.IDAPP!=="B03");
            this.cantServ = aSearchhelp.length;
            this.iFlag=0;
            if(aSearchhelp.length>0){
                BusyIndicator.show(0);
                aSearchhelp.forEach(oServ=>{
                    oServ.param={};
                    oServ.param.nombreAyuda=oServ.TABLA
                    oServ.p_user = "FGARCIA";
                    this._getSearchingHelp(oServ,oObject);
                })
            }else{
                let aFields =  oObject.fields.filter(oField=>oField.CONTROLSEARCH);
                if(aFields.length>0)
                    this.mostrarBusquedaBasica(oObject);
            }
            this.crearColumnasRegistro(oObject);
            
            // llamando a servicios
            let aServicesDom = oObject.services.filter(serv=>serv.TIPOPARAM==="DOMINIO"),
            aParams=[],
            oService={};
            oService.param={};
            if(aServicesDom.length>0){
                BusyIndicator.show(0);
                aServicesDom.forEach(serv=>{
                    let oDominio={};
                    oDominio.domname=serv.DOMNAME;
                    oDominio.status=serv.STATUS_DOMNAME;
                    aParams.push(oDominio);
                    oService.PATH=serv.PATH;
                    oService.MODEL=serv.MODEL
                });
                oService.param.dominios=aParams;
                this._getDataDominios(oService,oObject);
            }else{
                let oServiceTable = oObject.services.find(serv=>serv.IDSERVICE==="TABLE");
                oServiceTable.param = {};
                oServiceTable.param.delimitador=oServiceTable.DELIMITADOR;
                oServiceTable.param.fields=[];
                oServiceTable.param.no_data=oServiceTable.NO_DATA;
                oServiceTable.param.option=[];
                oServiceTable.param.options=[];
                oServiceTable.param.order=oServiceTable.ORDER_S;
                oServiceTable.param.p_user="FGARCIA";
                oServiceTable.param.rowcount=oServiceTable.ROWCOUNT_S;
                oServiceTable.param.rowskips=oServiceTable.ROWSKIPS;
                oServiceTable.param.tabla=oServiceTable.TABLA;
                this._getReadTable(oServiceTable,oObject);
            }
            let oModel = this.getModel();
            oModel.setProperty(`/help`,{});
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

		},

		_onMetadataLoaded : function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
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


		/* =========================================================== */
		/* Custom: codigo para refactorizar                            */
		/* =========================================================== */


		/**
         * Guardar inputs de la tabla modelo 3
         * @param {*} oEvent 
         */
		 onSaveTableUpdate:function(oEvent){
            BusyIndicator.show(0);
            let oContext = oEvent.getSource().getBindingContext(),
            oMaster = oContext.getObject(),
            oServiceUpdate = oMaster.services.find(oServ=>oServ.IDSERVICE==="UPDATE"),
            oModelUpdate = this.getModel(oServiceUpdate.MODEL),
            aDataUpdate = oModelUpdate.getProperty("/dataUpdate"),
            oParam={};
            
            if(!aDataUpdate||aDataUpdate.length===0){
                BusyIndicator.hide();
                this.getMessageDialog("Warning", "No existen registros a modificar");
                return;
            }
            // this.cantServ = aDataUpdate.length;
            // this.iFlag=0;
            oParam.id=oServiceUpdate.TIPOPARAM;
            oParam.p_user="FGARCIA";
            oParam.str_set=aDataUpdate;
            oServiceUpdate.param=oParam;
            this._updateServiceTable(oServiceUpdate);
            
            // aDataUpdate.forEach(oServ=>{
            //     oServ.id="";
            //     oServ.p_user="FGARCIA";
            //     oServ.srt_set=oServ;
            //     // oServ.tabla=oServiceUpdate.TABLA;
            //     // oServ.flag="";
            //     oServiceUpdate.param=oServ;
            //     this._updateServiceTable(oServiceUpdate);
            // })
        },

         /**
          * Creación de Columnas para Lista de Registro
          */
         
         crearColumnasRegistro:function(oMaster){
            let oTable = this.mFragments["Tabla"],
            oViewModel = this.getModel("detailView"),
            oDetailPage = this.getView().byId("detailPage");
            if(oMaster.IDAPP==="M13"){
                oTable.setColumnas(oMaster,oMaster.IDAPP);
                oTable.setItems(oMaster,oMaster.IDAPP);
            }else{
                oTable.setColumnas(oMaster);
                oTable.setItems(oMaster);
            }
            let oField = oMaster.fields.find(oField=>oField.CONTROLTABLE==="INPUT"||oField.CONTROLTABLE==="COMBOBOX");
            if(oField)
                oViewModel.setProperty("/showFooter",true);
            oDetailPage.setContent(oTable.getControl())
         },

         /**
          * Creacion de campos de Busqueda simple
          * @param {aCampos} aCampos 
          */
         mostrarBusquedaBasica:function(oMaster,param){
            let oForm = this.mFragments["BusquedaBasica"],
            oDetailPage = this.getView().byId("detailPage"),
            oViewModel=this.getModel("detailView");
            oViewModel.setProperty("/titleForm","Datos de Selección");
            oForm.setCamposBusqueda(oMaster,param);
            oDetailPage.addHeaderContent(oForm.getControl());
         },
         mostrarBusquedaAvanzada:function(oMaster,param){
            let oView=this.getView(),
            // oPanel = this.mFragments["PanelFragment"],
            oPanelAdvanced=this.buildPanels(),
            oDetailPage = oView.byId("detailPage"),
            oForm  = this.mFragments["BusquedaAvanzada"];
            oPanelAdvanced.setHeaderText("Busqueda avanzada");
            oForm.setCamposBusqueda(oMaster,param);
            oPanelAdvanced.addContent(oForm.getControl());
            oDetailPage.addHeaderContent(oPanelAdvanced);
         },

         /**
          * Creacion de campos para el formulario editar y nuevo
          * @param {aCampos} aColumnas 
          */
         crearFormNuevo:function(oMaestro,oContextData,sSelectedKey){
             this.crearFragments("NewMaster");
             this.crearFragments("FormNew");
             let oDialog = this.mFragments["NewMaster"],
             oModelMaster = this.getModel("DATOSMAESTRO"),
             sTitle = oContextData ? "Editar registro" : "Nuevo Registro";
             oDialog.getControl().setTitle(sTitle);
             if(oMaestro.IDAPP!=="M13"){
                 let oFormNew = this.mFragments["FormNew"];
                 oFormNew.getControl().removeAllFormContainers();
                 oFormNew.setCamposNuevo(oMaestro);
                 oDialog.getControl().addContent(oFormNew.getControl());
             }else{
                 if(oContextData){
                    oModelMaster.setProperty("/codEmbar",oContextData.CDEMB);
                    sTitle = `Editar embarcación: ${oContextData.CDEMB}`;
                    oDialog.getControl().setTitle(sTitle);
                 }
                 let PanelGeneral=this.buildPanels("Datos Generales"),
                 PanelEmbarcacion=this.buildPanels("Características de la embarcación"),
                 PanelCapacidades=this.buildPanels("Capacidades"),
                 PanelERP=this.buildPanels("Datos ERP"),
                 PanelConvenio=this.buildPanels("Convenio Pesca Sur"),
                 PanelCuota=this.buildPanels("% Cuota Nacional");
                 
                 let cantContent = oDialog.getControl().getContent().length;
                 if(cantContent===0)
                     oDialog.setIconTabBar(ItemsTab)
                 
                 if(cantContent===0||sSelectedKey==="01"){
                     this.crearFragments("FormGeneral");
                     this.crearFragments("FormEmb");
                     this.crearFragments("FormCapacidad");
                     this.crearFragments("FormERP");
                     this.crearFragments("FormConvenio");
                     this.crearFragments("FormCuota");
    
                     let oFormGeneral = this.mFragments["FormGeneral"],
                     oFormEmb = this.mFragments["FormEmb"],
                     oFormCapacidad = this.mFragments["FormCapacidad"],
                     oFormERP = this.mFragments["FormERP"],
                     oFormPesca = this.mFragments["FormConvenio"],
                     oFormCuota = this.mFragments["FormCuota"];
    
                     oFormGeneral.setCamposNuevo(oMaestro,"T01","P01");
                     oFormEmb.setCamposNuevo(oMaestro,"T01","P02");
                     oFormCapacidad.setCamposNuevo(oMaestro,"T01","P03");
                     oFormERP.setCamposNuevo(oMaestro,"T01","P04");
                     oFormPesca.setCamposNuevo(oMaestro,"T01","P05");
                     oFormCuota.setCamposNuevo(oMaestro,"T01","P06");
    
                     PanelGeneral.addContent(oFormGeneral.getControl());
                     PanelEmbarcacion.addContent(oFormEmb.getControl());
                     PanelCapacidades.addContent(oFormCapacidad.getControl()); 
                     PanelERP.addContent(oFormERP.getControl()); 
                     PanelConvenio.addContent(oFormPesca.getControl()); 
                     PanelCuota.addContent(oFormCuota.getControl());
    
                     let oContent = oDialog.getControl().getContent()[0];
                     oContent.addContent(PanelGeneral);
                     oContent.addContent(PanelEmbarcacion);
                     oContent.addContent(PanelCapacidades); 
                     oContent.addContent(PanelERP); 
                     oContent.addContent(PanelConvenio); 
                     oContent.addContent(PanelCuota);
                 }
             }
         },

         buildControlEmb:function(){

         },
        
         removeControls:function(){
            const oView = this.getView(),
            oContext = oView.getBindingContext(),
            oMaster = oContext?oContext.getObject():undefined,
            oDetailPage = oView.byId("detailPage"),
            oViewModel = this.getModel("detailView"),
            oModel = this.getModel(),
            oModelMaestro = this.getModel("DATOSMAESTRO");
            
            oModelMaestro.setData({});
            oModelMaestro.updateBindings(true);
            oViewModel.setProperty("/showFooter",false);

            let aRemovedControlsHeader = oDetailPage.removeAllHeaderContent();
            aRemovedControlsHeader[0]?.removeAllFormContainers();
            let aRemovedControlsPanel = aRemovedControlsHeader[1]?.removeAllContent();
            aRemovedControlsPanel?.forEach(ctrl=>ctrl.removeAllFormContainers())
            // aRemovedControlsHeader.forEach(ctrl=>{
            //     ctrl.removeAllFormContainers();
            // });

            const oTable = oDetailPage.getContent();
            if(oTable){
                oTable.removeAllColumns();
                oTable.unbindAggregation("items",true);
            }

            if(oMaster)
                this.cleanForm(oMaster,"flag");
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
                        control.setValue("");
                    }
                    if(oField.IDFIELD==="ROWCOUNT")
                        control.setValue(100);
                }
            });
            BusyIndicator.hide();
         },

         crearFragments:function(sNameFragment){
             this.mFragments = this.mFragments || {};
             var oFragment = this.mFragments[sNameFragment];
             if (!oFragment) {
				oFragment = new Fragments(this.getView(),sNameFragment);
                this.mFragments[sNameFragment] = oFragment;
            }
            oFragment.openBy();
         },

         setFragEmb:function(sNameFrag){
			this.mFragEdit = this.mFragEdit || {};
			var oFragment = this.mFragEdit[sNameFrag];
			if (!oFragment) {
			   oFragment = new Embarcaciones(this.getView(),sNameFrag);
			   this.mFragEdit[sNameFrag] = oFragment;
		   }
		},

         /**
          * Consumiendo servicios
          * @param {*} oModel 
          */
         _getReadTable:function(service,oMaster){
             let that = this,
             oModel = that.getModel(service.MODEL),
             sUrl = HOST+service.PATH,
             aData,
             aDatatable = this.getDataService(sUrl, service.param);
             aDatatable
             .then(res=>res.json())
             .then(data=>{
                aData = data.data;
                let aServicesDom=oMaster.services.filter(serv=>serv.TIPOPARAM==="DOMINIO"),
                aDataDom;
                aData.forEach(item=>{
                    aServicesDom.forEach(serv=>{
                        if(item[serv?.IDSERVICE]){
                            aDataDom=oModel.getProperty(`/${serv.IDSERVICE}`);
                            aDataDom?.forEach(dom=>{
                                if(dom.id===item[serv.IDSERVICE])
                                    item[serv.IDSERVICE]=dom.descripcion;
                            })
                        }
                    })
                })
                oModel.setProperty(service.PROPERTY,aData)
                oModel.setProperty("/cantData",aData.length);
                // configuraciones para maestro grupo de flota
                if(oMaster.IDAPP==="M20"){
                    let oTable = this.getView().byId("lineItemsList"),
                    aItems = oTable.getItems(),
                    oCell;
                    aItems.forEach(oItem=>{
                        oCell = oItem.getCells()[2];
                        oCell.addStyleClass(oCell.getText());
                        oCell.setText("______");
                    })
                }
                BusyIndicator.hide();
            })
            .catch(error=>{
                BusyIndicator.hide();
                oModel.setProperty(service.PROPERTY,[])
            })
         },

        _getDataDominios:function(service,oMaster){
            let that = this,
            oModel = that.getModel(service.MODEL),
            sUrl = HOST+service.PATH,
            oGetDominios = this.getDataService(sUrl, service.param),
            aData;
            oGetDominios
            .then(res=>res.json())
            .then(data=>{
                aData = data.data;
                let aServicesDom = oMaster.services.filter(serv=>serv.TIPOPARAM==="DOMINIO");
                aServicesDom.forEach(serv=>{
                    aData.forEach(dom=>{
                        if(serv.DOMNAME===dom.dominio)
                            oModel.setProperty(`/${serv.IDSERVICE}`,dom.data)
                    });
                })
                let aServices = oMaster.services.filter(serv=>serv.INITSERVICE==="TRUE"&&serv.TIPOPARAM==="PARAM");
                if(aServices.length>0){
                    aServices.forEach(serv=>{
                        serv.param={};
                        serv.param={};
                        serv.param.delimitador=serv.DELIMITADOR;
                        serv.param.fields=[];
                        serv.param.no_data=serv.NO_DATA;
                        serv.param.option=[];
                        serv.param.options=[];
                        serv.param.order=serv.ORDER_S;
                        serv.param.p_user="FGARCIA";
                        serv.param.rowcount=serv.ROWCOUNT_S;
                        serv.param.rowskips=serv.ROWSKIPS;
                        serv.param.tabla=serv.TABLA;
                        this._getReadTable(serv,oMaster);
                    });
                    
                }else{
                    BusyIndicator.hide();
                }
            })
            .catch(error=>{
                BusyIndicator.hide();
                console.log(error);
            })
        },

        _getSearchingHelp:function(service,oObject){
            let that = this,
            oModelService = that.getModel(service.MODEL),
            oModel = that.getModel(),
            sUrl = HOST+service.PATH,
            oGetSearchingHelp = this.getDataService(sUrl, service.param),
            aData;
            oGetSearchingHelp
            .then(res=>res.json())
            .then(data=>{
                this.iFlag++;
                aData = data.data;
                let oDataFields = oModel.getProperty("/helpFieldList"),
                aFieldsName=oDataFields.filter(oField=>oField.IDAPP===service.IDAPP);
                aFieldsName.sort((a,b)=>a.ORDENMEW-b.ORDENMEW);
                oModelService.setProperty(`/${service.IDAPP}`,aData);
                oModelService.setProperty(`/name${service.IDAPP}`,aFieldsName)
                if(this.cantServ === this.iFlag){
                    // modelo 1
                    let aFields =  oObject.fields.filter(oField=>oField.CONTROLSEARCH);
                    if(aFields.length>0){
                        if(oObject.IDAPP==="M13"){
                            this.mostrarBusquedaBasica(oObject,"M13");
                            this.crearFragments("BusquedaAvanzada");
                            this.mostrarBusquedaAvanzada(oObject,"A");     
                        }/*else if(oObject.IDAPP==="M22"){
                            this.mostrarBusquedaBasica(oObject,"flag");
                        }*/else{
                            this.mostrarBusquedaBasica(oObject);
                        }
                    }
                    // BusyIndicator.hide();
                }
            })
            .catch(error=>{
                console.log(error);
                BusyIndicator.hide();
            })
        },

        _updateService:function(service,oMaster){
            let that = this,
            sTypeDialog="Success",
            oModel = that.getModel(service.MODEL),
            sUrl = HOST+service.PATH,
            oDataUpdate=this.getDataService(sUrl, service.param);
            oDataUpdate.then(res=>res.json())
            .then(data=>{
                that.mFragments["NewMaster"].getControl().close();
                // BusyIndicator.hide();
                if(data.t_mensaje[0].CDMIN==="007"){
                    that.getMessageDialog(sTypeDialog,data.t_mensaje[0].DSMIN);
                    
                }else if(data.t_mensaje[1].CDMIN==="006"){
                    that.getMessageDialog(sTypeDialog,data.t_mensaje[1].DSMIN);
                }else{
                    that.getMessageDialog("Error","No se resgitró");
                }
                let oServiceBusqueda = oModel.getProperty("/serviceBusqueda");
                if(!oServiceBusqueda){
                    oServiceBusqueda = oMaster.services.find(serv=>serv.IDSERVICE==="TABLE");
                    oServiceBusqueda.param={};
                    oServiceBusqueda.param.delimitador=oServiceBusqueda.DELIMITADOR;
                    oServiceBusqueda.param.fields=[];
                    oServiceBusqueda.param.no_data=oServiceBusqueda.NO_DATA;
                    oServiceBusqueda.param.option=[];
                    oServiceBusqueda.param.options=[];
                    oServiceBusqueda.param.order=oServiceBusqueda.ORDER_S;
                    oServiceBusqueda.param.p_user="FGARCIA";
                    oServiceBusqueda.param.rowskips=oServiceBusqueda.ROWSKIPS;
                    oServiceBusqueda.param.tabla=oServiceBusqueda.TABLA;

                    let oFieldRowCount = oMaster.fields.find(oField=>oField.IDFIELD==="ROWCOUNT");
                    oServiceBusqueda.param.rowcount=oFieldRowCount?"100":"";
                        
                }
                
                this._getReadTable(oServiceBusqueda,oMaster);
                oModel.setProperty("/serviceBusqueda",undefined);
                // limpiar data
                let aNewFields = oMaster.fields.filter(oField=>oField.CONTROLNEW),
                oControl;
                aNewFields.forEach(oField=>{
                    oControl = this.mFields[`${oField.IDFIELD}N`];
                    if(oField.CONTROLNEW==="INPUT"||oField.CONTROLNEW==="INPUT/NUMERIC"){
                        oControl.setValue("");
                    }else if(oField.CONTROLNEW==="COMBOBOX"){
                        oControl.setSelectedKey("")
                    }else if(oField.CONTROLNEW==="DATE"){
                        oControl.setValue("");
                    }
                    oModel.setProperty(`${oField.IDFIELD}N`,"")
                })
                // oModel.refresh(true);
            }).catch(err=>{
                sTypeDialog="Error"
                that.getMessageDialog(sTypeDialog,err);
                BusyIndicator.hide();
            });
        },

        _updateServiceTable:function(oService){
            let sUrl = HOST+oService.PATH,
            oModelUpdate = this.getModel(oService.MODEL),
            getDataUpdate = this.getDataService(sUrl, oService.param);
            getDataUpdate.then(res=>res.json())
            .then(data=>{
                // this.iFlag++;
                // if(this.cantServ===this.iFlag){
                    BusyIndicator.hide();
                    this.getMessageDialog("Success","Se guardó correctamente");
                    oModelUpdate.setProperty("/dataUpdate",[])
                // }
            })
            .catch(error=>{
                console.log(error)
            })

        },

         getEmbarcAdicional:function(oMaster,sParam){
            const oService = oMaster.services.find(oServ=>oServ.IDSERVICE==="ADICIONAL");
            const sURl = HOST+oService.PATH ;
            oService.param = {
                p_code: sParam,
                p_user: "FGARCIA"
            }
            let oGetEmbAdic = this.getDataService(sURl,oService.param),
            oModelMaster = this.getModel(oService.MODEL),
            aNewFields=[];
            oGetEmbAdic.then(res=>res.json())
            .then(data=>{
                oModelMaster.setProperty("/s_pe",data.s_pe)
                oModelMaster.setProperty("/s_ps",data.s_ps)
                oModelMaster.setProperty("/s_ee",data.s_ee);
                oModelMaster.setProperty("/s_be",data.s_be);
                oModelMaster.setProperty("/str_hor",data.str_hor);
                
            })
            .catch(error=>{
                console.log(error);
                BusyIndicator.hide();
            })
         },

         _updateEmbarcacion:function(service){
             let sUrl = HOST+"/api/embarcacion/Editar_Crear/",
             oDataUpdate=this.getDataService(sUrl, service.param);
             console.log(service.param);
             oDataUpdate.then(res=>res.json())
             .then(data=>{
                 console.log(data);
                BusyIndicator.hide();
                this.mFragments["NewMaster"].getControl().close();
                var message = "";
                if(service.param.params.p_case==="E"){
                    message="El registro "+service.param.params.p_code+" ha sido modificado satisfactoriamente";
                }else{
                    for(var i=0;i<data.t_mensaje.length;i++){
                        message+=data.t_mensaje[i].DSMIN+"\n";
                    }
                }
                this.getMessageDialog("Success",message);
             })

         },

         getDataSearchHelp:function(oService){
            let sUrl = HOST+oService.PATH,
            oModelMaster = this.getModel(oService.MODEL),
             oDataUpdate=this.getDataService(sUrl, oService.param);
             oDataUpdate.then(res=>res.json())
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
         },
         cargaMasivaHisto:function(service){
            let sUrl = HOST+service.PATH,
            oDataUpdate=this.getDataService(sUrl, service.param);
            oDataUpdate.then(res=>res.json())
            .then(data=>{
                BusyIndicator.hide();
                this.getMessageDialog("Success",/*data.t_mensaje[0].DSMIN*/"Se guardó con éxito");
            }).catch(err=>{
                BusyIndicator.hide();
                this.getMessageDialog("Error",err);
            });
         }
	});

});