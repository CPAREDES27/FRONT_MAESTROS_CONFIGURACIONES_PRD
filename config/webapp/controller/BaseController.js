sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/BusyIndicator",
	"sap/base/Log",
	"./Fragments",
	"./CalendarioPesca",
	"sap/ui/core/format/DateFormat"
], function (Controller,
	History,
	BusyIndicator,
	Log,
	Fragments,
	CalendarioPesca,
	DateFormat) {
	"use strict";

	return Controller.extend("com.tasa.config.controller.BaseController", {
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter : function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel : function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel : function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle : function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},
		
		Count:0,

		CountService:0,

		/**
		 * 
		 * @returns url of subaccount 
		 */
		 getHostSubaccount: function () {
            var urlIntance = window.location.origin,
            sUrlSubaccount,
            sParam; 

			if (urlIntance.indexOf('tasaqas') !== -1) {
                sUrlSubaccount = 'tasaqas'; // aputando a QAS
                sParam = "IDH4_QAS"
            } else if (urlIntance.indexOf('tasaprd') !== -1) {
                sUrlSubaccount = 'tasaprd'; // apuntando a PRD
                sParam = "IDH4_PRD"
            }else if(urlIntance.indexOf('localhost') !== -1){
				// sUrlSubaccount = 'tasadev'; // apuntando a DEV
                // sParam = "IDH4_DEV"
				sUrlSubaccount = 'tasaqas'; // aputando a QAS
                sParam = "IDH4_QAS"
			}else{
				// sUrlSubaccount = 'tasadev'; // apuntando a DEV
                // sParam = "IDH4_DEV"
				sUrlSubaccount = 'tasaqas'; // aputando a QAS
                sParam = "IDH4_QAS"
			}

            return {
                url : `https://${sUrlSubaccount}.launchpad.cfapps.us10.hana.ondemand.com`, 
                param : sParam
            };
        },

		/**
		 * 
		 * @returns url service
		 */
		 getHostService: function () {
            var urlIntance = window.location.origin,
            servicioNode ; 

			if (urlIntance.indexOf('tasaqas') !== -1) {
                servicioNode = 'qas'; // aputando a QAS
            } else if (urlIntance.indexOf('tasaprd') !== -1) {
                servicioNode = 'prd'; // apuntando a PRD
            }else if(urlIntance.indexOf('localhost') !== -1){
				// servicioNode = 'cheerful-bat-js'; // apuntando a DEV
				servicioNode = 'qas'; // aputando a QAS
			}else{
				// servicioNode = 'cheerful-bat-js'; // apuntando a DEV
				servicioNode = 'qas'; // aputando a QAS
			}

            return `https://cf-nodejs-${servicioNode}.cfapps.us10.hana.ondemand.com`;
        },

		
		buildFragments:function(sNameFrag){
			this.mFragments = this.mFragments || {};
            var oFragment = this.mFragments[sNameFrag];
            if (!oFragment) {
				oFragment = new Fragments(this.getView(),sNameFrag);
				oFragment.openBy();
                this.mFragments[sNameFrag] = oFragment;
            }
			return oFragment;
		},

		buildCalendarioPesca:function(sNameFrag){
			this.mFragments = this.mFragments || {};
            var oFragment = this.mFragments[sNameFrag];
            if (!oFragment) {
				oFragment = new CalendarioPesca(this.getView(),sNameFrag);
				oFragment.openBy();
                this.mFragments[sNameFrag] = oFragment;
            }
			return oFragment;
		},
		getMessageDialog:function(sTypeDialog,sMessage){
			// if (!this.oWarningMessageDialog) {
				this.oWarningMessageDialog = new sap.m.Dialog({
					type: sap.m.DialogType.Message,
					title: "Mensaje",
					state: sTypeDialog,
					content: new sap.m.Text({ text: sMessage }),
					beginButton: new sap.m.Button({
						type: sap.m.ButtonType.Emphasized,
						text: "OK",
						press: function () {
							this.oWarningMessageDialog.close();
						}.bind(this)
					})
				});
			// }

			this.oWarningMessageDialog.open();
		},

		/**
		 * 
		 * @param {*} sUrl 
		 * @param {*} oBody 
		 * @returns 
		 */
		getDataService:async function(sUrl,oBody){
			try {
				BusyIndicator.show(0);
				this.Count++;
				let oFetch = await fetch(sUrl,{
					method:'POST',
					body:JSON.stringify(oBody)
				});
				if(oFetch.status===200){
					if(this.Count === this.CountService) BusyIndicator.hide();
					return await oFetch.json();
				}else{
					BusyIndicator.hide();
					Log.error(`Status:${oFetch.status}, ${oFetch.statusText}`);
					return null;
				}
			} catch (error) {
				Log.error(`Error:${error}`);
				BusyIndicator.hide();
				this.getMessageDialog("Error","No se pudo conectar");
			}
		},

		/**
		 * 
		 * @returns User loggued
		 */
		 _getCurrentUser: async function(){
            let oUshell = sap.ushell,
            oUser={};
            if(oUshell){
                oUser = await sap.ushell.Container.getServiceAsync("UserInfo");
                let sEmail = oUser.getEmail().toUpperCase(),
                sName = sEmail.split("@")[0],
                sDominio= sEmail.split("@")[1];
                if(sDominio === "XTERNAL.BIZ") sName = "CLAHURA";
                oUser = {
                    email:sEmail,
                    name:sName
                }
            }else{
                oUser = {
                    email:"CLAHURA@XTERNAL.BIZ",
                    name: "CLAHURA"
                };
            }
			return oUser
        },

		/**
		 *  Recibe objecto Date y devuelce string dd/mm/yyyy
		 * usado para formatvalue de DatePicker
		 * @param {*} oDate 
		 * @returns 
		 */
		setFormatDate:function(oDate){
			let oInstance = DateFormat.getDateInstance({
				pattern:"dd/MM/yyyy"
			})
			return oInstance.format(oDate,true);
		},

		/**
		 * recibe objecto Date y devuelve string yyyymmdd
		 * usado para trama de servicio
		 * @param {*} oDate 
		 * @returns 
		 */
		paramDate:function(oDate){
			let day = oDate.getDate()
			let month = oDate.getMonth() + 1
			let year = oDate.getFullYear()

			if(month < 10)
				month=`0${month}`;
			if(day < 10)
				day = `0${day}`;
			return `${year}${month}${day}`
		},

		/**
		 * Recibe objeto Date y devuelve string dd/mm/yyyy
		 * @param {*} oDate 
		 * @returns 
		 */
		setStringDate:function(oDate){
			let sDate;
			if(oDate){
				sDate =oDate.getDate()+"/"+(oDate.getMonth()+1)+"/"+oDate.getFullYear();
				return sDate;
			}else{
				return oDate
			}
		},

		/**
		 * usado para comparaciones
		 * Recibe string yyyy/mm/dd y devuelve objecto Date con horas 00:00:00
		 * @param {*} sString 
		 * @returns 
		 */
		setObjectDate:function(sString){
			let year = sString.slice(0, 4),
			month = sString.slice(4, 6),
			day = sString.slice(6);
			return new Date(year,month-1,day);
		},

		/**
		 * usado para comparar
		 * Recibe objeto Date y devuelve objecto Date con horas 00:00:00
		 * @param {*} oDate 
		 * @returns 
		 */
		setDate:function(oDate){
			let day = oDate.getDate(),
			month = oDate.getMonth() + 1,
			year = oDate.getFullYear();
			return new Date(year,month-1,day);
		},

		buildFormContainer:function(){
			let oControl = new sap.ui.layout.form.FormContainer;
			return oControl;
		},

		buildFormElement:function(){
			let oControl = new sap.ui.layout.form.FormElement;
			return oControl;
		},
		buildFields:function(aFields){
			let aControls = [],
			oControl,
			sBind;
            aFields.forEach(oField=>{
				oControl=this.mFields[oField.IDFIELD];
				if(!oControl){
					if(oField.CONTROLSEARCH==="INPUT"){
						oControl = new sap.m.Input({
							value:sBind,
							placeholder:`Ingrese ${oField.NAMEFIELD}`,
							maxLength:oField.LENGTH,
						})
					}else if(oField.CONTROLSEARCH==="COMBOBOX"){
						oControl = new sap.m.ComboBox
					}
					this.mFields[oField.IDFIELD]=oControl
					aControls.push(oControl)
				}
            });
			return aControls;
        },

	});

});