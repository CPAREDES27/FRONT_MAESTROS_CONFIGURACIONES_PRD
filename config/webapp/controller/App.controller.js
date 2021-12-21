sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	const HOST = "https://cf-nodejs-qas.cfapps.us10.hana.ondemand.com";
    // const USER_HOST = "https://current-user-qas.cfapps.us10.hana.ondemand.com";
    const USER_HOST ="https://nodeapp-api-qas.cfapps.us10.hana.ondemand.com/";
	
	return BaseController.extend("com.tasa.config.controller.App", {

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
            this.Count = 0; 
            this.CountService = 1;
			this._getListaMaestros(oViewModel);
            this._getCurrentUser();
		},

		_getListaMaestros: async function(oViewModel){
            let oModel = this.getModel(),
            iOriginalBusyDelay = this.getView().getBusyIndicatorDelay(),
            sUrl = HOST+"/api/General/AppMaestros/",
            oParams = {
                p_app: "",
                p_rol: "ADMINISTRADOR_SISTEMA",
				p_tipo: "CONFIGURACIONES"
            },
            oDataMaestros = await this.getDataService(sUrl,oParams);
            
            if(oDataMaestros){
                let aApps = oDataMaestros.t_tabapp,
                aFields = oDataMaestros.t_tabfield,
                aServices = oDataMaestros.t_tabservice,
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
                oModel.setProperty("/listaConfig",aApps);
                oModel.setProperty("/helpFieldList",aFields);
            }else{
                this.getMessageDialog("Information", `No se econtraron registros`);    
            }
            oViewModel.setProperty("/busy",false);
            oViewModel.setProperty("/delay",iOriginalBusyDelay);
        },

        _getCurrentUser:function(){
            let sToken = "eyJhbGciOiJSUzI1NiIsImprdSI6Imh0dHBzOi8vdGFzYXFhcy5hdXRoZW50aWNhdGlvbi51czEwLmhhbmEub25kZW1hbmQuY29tL3Rva2VuX2tleXMiLCJraWQiOiJkZWZhdWx0LWp3dC1rZXktMTgyMzc4NDkzNSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3Njc5NGE4YzNlNjA0N2ZkYWNiMzdhYzU1OTA1ZmJmMyIsImV4dF9hdHRyIjp7ImVuaGFuY2VyIjoiWFNVQUEiLCJzdWJhY2NvdW50aWQiOiJkNmUwNDU2NC1mZmNjLTQ0MzgtYmU3ZS0xMDE0OGE2OTI1OTIiLCJ6ZG4iOiJ0YXNhcWFzIn0sInhzLnN5c3RlbS5hdHRyaWJ1dGVzIjp7InhzLnJvbGVjb2xsZWN0aW9ucyI6WyJBZG1pbmlzdHJhZG9yX0plZmVfVHVybm9fUGxhbnRhIiwiRGV2ZWxvcGVyX1JvbGUiLCJCdXNpbmVzc19BcHBsaWNhdGlvbl9TdHVkaW9fRGV2ZWxvcGVyIiwiQnVzaW5lc3NfQXBwbGljYXRpb25fU3R1ZGlvX0V4dGVuc2lvbl9EZXBsb3llciIsIkJ1c2luZXNzX0FwcGxpY2F0aW9uX1N0dWRpb19BZG1pbmlzdHJhdG9yIiwiQ2xvdWRfQ29ubmVjdG9yX0FkbWluIl19LCJnaXZlbl9uYW1lIjoiQ2Vsc28iLCJ4cy51c2VyLmF0dHJpYnV0ZXMiOnt9LCJmYW1pbHlfbmFtZSI6IkFybWFzIiwic3ViIjoiNTM1MDZlMzMtZWVkMi0wZWI5LTc4Y2EtMDhkMjFlOTU5NWZhIiwic2NvcGUiOlsib3BlbmlkIl0sImNsaWVudF9pZCI6InNiLWZsb3RhLWpjbyF0MzE3MjUiLCJjaWQiOiJzYi1mbG90YS1qY28hdDMxNzI1IiwiYXpwIjoic2ItZmxvdGEtamNvIXQzMTcyNSIsImdyYW50X3R5cGUiOiJhdXRob3JpemF0aW9uX2NvZGUiLCJ1c2VyX2lkIjoiNTM1MDZlMzMtZWVkMi0wZWI5LTc4Y2EtMDhkMjFlOTU5NWZhIiwib3JpZ2luIjoic2FwLmRlZmF1bHQiLCJ1c2VyX25hbWUiOiJjdGlyYWRvQHh0ZXJuYWwuYml6IiwiZW1haWwiOiJjdGlyYWRvQHh0ZXJuYWwuYml6IiwiYXV0aF90aW1lIjoxNjM5NTIxMjM4LCJyZXZfc2lnIjoiN2UwMTQ1YjAiLCJpYXQiOjE2Mzk1MjMwNzgsImV4cCI6MTYzOTU2NjI3OCwiaXNzIjoiaHR0cHM6Ly90YXNhcWFzLmF1dGhlbnRpY2F0aW9uLnVzMTAuaGFuYS5vbmRlbWFuZC5jb20vb2F1dGgvdG9rZW4iLCJ6aWQiOiJkNmUwNDU2NC1mZmNjLTQ0MzgtYmU3ZS0xMDE0OGE2OTI1OTIiLCJhdWQiOlsib3BlbmlkIiwic2ItZmxvdGEtamNvIXQzMTcyNSJdfQ.VyF4BWlq5T1nY06xVkyyEJ-An8wNBvxd7AIka0BLolUvAWaX4pgvJDlgGsXgsYF7hLxmOVinvuDaWS8BFAmpetTSFdupy3Sx-iss2LQBO6dCRtnTY3uwFK_s7PxLRzU-KCBppRnje5TNpNYy5elRa65OCZaQwkMx7gajsYSUGqBiYO5iEMIEx49cBNgHfY9L-ikjUjqUP7RBFcP0-jGYid9kKhA8yXDj7edutns4ZyLWkVVJfB8vCFJPpa79UkPeFVMKoNaH-J1lJndnPaYKp4B9rDjCSv9ScxsWFwKRBkz2jU3aezumflOWWyp7olryiuEZFguIZS16ctENwknQCg";
            // fetch(USER_HOST,{
            //     method:'POST',
            //     mode:"cors",
            //     headers: {
            //         'Content-Type': 'application/x-www-form-urlencoded',
            //         'Authorization': 'Bearer ' + sToken
            //     }
            // }).then(res=>res.json()).then(data=>{
            //     console.log(data)
            // })
            // .catch(error=>{
            //     console.log(error);
            // });
            
            // $.ajax({
            // url: "/roles/",
            // dataType: 'jsonp',
            //     success: function (result, status, xhr) {
            //         console.log(result);
            //     },
            //     error: function (xhr, status, error) {
            //          console.log(error);
            //     }
            // });

            $.ajax( "/roles/",{
                header:{
                    "x-csrf-token":"fetch"
                },
                "success": function(response) {
                    console.log(response)
                },
                "error": function(errorThrown) {
                    console.log(errorThrown)
                }
            });
        }

	});
});