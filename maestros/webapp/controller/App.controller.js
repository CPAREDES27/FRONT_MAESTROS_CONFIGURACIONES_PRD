sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

    const HOST = "https://cf-nodejs-qas.cfapps.us10.hana.ondemand.com";

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
			this.getOwnerComponent().getModel().dataLoaded().then(fnSetAppNotBusy);
			// this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			this._getListaMaestros(oViewModel);
            // this._getCurrentUser(oViewModel);
		},

		_getListaMaestros:function(oViewModel,sEmail){
            let oModel = this.getModel(),
            that = this,
            iOriginalBusyDelay = this.getView().getBusyIndicatorDelay(),
            sUrl = HOST+"/api/General/AppMaestros/",
            oParams = {
                p_app: "",
                // "p_rol": sEmail,
                p_rol: "CTIRADO@XTERNAL.BIZ",
                p_tipo:"MAESTRO"
            };

            let aDataMaster = this.getDataService(sUrl, oParams);
            aDataMaster
            .then(res=>res.json())
            .then(data=>{
                let aApps = data.t_tabapp,
                aFields = data.t_tabfield,
                aServices = data.t_tabservice,
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
                oViewModel.setProperty("/busy",false);
                oViewModel.setProperty("/delay",iOriginalBusyDelay);
            })
            .catch(error=>{
                this.getMessageDialog("Error", `Se presento un error: ${error}`);
                oViewModel.setProperty("/busy",false);
                oViewModel.setProperty("/delay",iOriginalBusyDelay);
            })
        },

        _getCurrentUser: async function(oViewModel){
            let oUserInfo = await sap.ushell.Container.getServiceAsync("UserInfo");
            if(oUserInfo){
                let sEmail = oUserInfo.getEmail().toUpperCase();
                this._getListaMaestros(oViewModel,sEmail);
            }
        }

	});
});