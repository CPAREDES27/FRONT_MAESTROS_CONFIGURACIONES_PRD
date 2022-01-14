sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("com.tasa.maestros.controller.App", {

		onInit : function () {
            var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy : true,
				delay : 0,
				layout : "OneColumn",
				previousLayout : "",
				actionButtonsInfo : {
					midColumn : {
						fullScreen : false
					}
				}
			});
			this.setModel(oViewModel, "appView");

			fnSetAppNotBusy = function() {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			// since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
			// this.getOwnerComponent().getModel().dataLoaded().then(fnSetAppNotBusy);
			// this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

            this.host = this.getHostService();
			this.Count = 0; 
            this.CountService = 1;
            this._getListaMaestros(oViewModel);
		},

		_getListaMaestros: async function(oViewModel){
            let oModel = this.getModel(),
            oUser = await this._getCurrentUser(),
            iOriginalBusyDelay = this.getView().getBusyIndicatorDelay(),
            sUrl = this.host+"/api/General/AppMaestros/",
            oParams = {
                p_app: "",
                "p_rol": oUser.email,
                p_tipo:"MAESTRO"
            },
            aDataMaster = await this.getDataService(sUrl, oParams);

            if(aDataMaster){
                let aApps = aDataMaster.t_tabapp,
                aFields = aDataMaster.t_tabfield,
                aServices = aDataMaster.t_tabservice,
                aFieldsApp,
                aServicesApp,
                aSearchingHelpApp,
                oSearchHelp,
                oSearchHelpExist,
                aSearchingHelp=aServices.filter(oServ=>oServ.MODEL==="AYUDABUSQUEDA");
                aApps.forEach(oApp=>{
                    aSearchingHelpApp=[];
                    aServicesApp=[];
                    aFieldsApp=[];
                    aFieldsApp=aFields.filter(oField=>oApp.IDAPP===oField.IDAPP);
                    aServicesApp=aServices.filter(oService=>oApp.IDAPP===oService.IDAPP);
                    oApp.fields=aFieldsApp;
                    oApp.services=aServicesApp;
                    oApp.searchHelp=aSearchingHelpApp;
                    aFieldsApp.forEach(oField=>{
                        oSearchHelp=aSearchingHelp.find(oServ=>oServ.IDAPP===oField.COMPONENT);
                        if(oSearchHelp){
                            oSearchHelpExist = aSearchingHelpApp.find(serv=>serv.IDAPP===oSearchHelp.IDAPP);
                            if(!oSearchHelpExist)
                                aSearchingHelpApp.push(oSearchHelp)
                        }
                    })
                    oApp.icon="sap-icon://busy"; 
                });
                oModel.setProperty("/listaMaestros",aApps);
                oModel.setProperty("/helpFieldList",aFields);
                oModel.setProperty("/user",oUser);
                oViewModel.setProperty("/busy",false);
                oViewModel.setProperty("/delay",iOriginalBusyDelay);
            }
        }

	});
});