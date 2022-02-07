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

            let oModel = this.getModel();

            this.host = this.getHostService();
			this.Count = 0; 
            this.CountService = 2;
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
                oModel.setProperty("/user",oUser);
                this.getSearchingHelpId(oModel);
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
                oViewModel.setProperty("/busy",false);
                oViewModel.setProperty("/delay",iOriginalBusyDelay);
            }
        },
        getSearchingHelpId: async function(oModel){
			let that = this, 
            oUser = oModel.getProperty("/user"),
			sAyudaBusqUrl = this.getHostService() +"/api/General/ConsultaGeneral/",
			oAyudaBusqService = {                                         // parametros para Ayudas de Busqueda
                name : "Ayuda de Búsqueda",
                url : sAyudaBusqUrl,
                param : {
                    nombreConsulta: "CONSGENCONST",
                    p_user: oUser.name,
                    parametro1: this.getHostSubaccount().param,
                    parametro2: "",
                    parametro3: "",
                    parametro4: "",
                    parametro5: "",
                    parametro6: ""
                }
            },
			oAyudaBusqData = await this.getDataService(sAyudaBusqUrl,oAyudaBusqService.param);

			if(oAyudaBusqData){
                let aAyudaBusqData = oAyudaBusqData.data;
                if(aAyudaBusqData.length > 0){
                    oModel.setProperty("/ayudaBusqId",aAyudaBusqData[0].LOW);
					this.getSerachingHelpComponents(oModel,aAyudaBusqData[0].LOW);
                }else{
                    this.setAlertMessage("information","No existen registros de la Ayuda de Búsqueda")
                }
            };

		},

		getSerachingHelpComponents:function(oModel,sAyudaBusqId){
			let sUrlSubaccount = this.getHostSubaccount().url,
			aSearchingHelp = ["busqembarcaciones"],
			oComponent,
			nameComponent,
			idComponent,
			urlComponent;
			
			aSearchingHelp.forEach(elem=>{
				oComponent = {};
				nameComponent = elem;
				idComponent = elem;
				urlComponent = `${sUrlSubaccount}/${sAyudaBusqId}.AyudasBusqueda.${elem}-1.0.0`;
				oComponent = new sap.ui.core.ComponentContainer({
					id:idComponent,
					name:nameComponent,
					url:urlComponent,
					settings:{},
					componentData:{},
					propagateModel:true,
					// componentCreated:comCreateOk,
					height:'100%',
					// manifest:true,
					async:false
				});
				oModel.setProperty(`/${elem}`,oComponent);
			});
		}

	});
});