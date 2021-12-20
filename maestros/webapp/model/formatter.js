sap.ui.define([], function () {
	"use strict";

	return {
		/**
		 * Rounds the currency value to 2 digits
		 *
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		currencyValue : function (sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		},
		tipoPesca:function(sParam){
			if(!sParam) return "";
			let value ,
			oModelMaster = this.getView().getModel("DATOSMAESTRO"),
			aData = oModelMaster.getProperty("/CDTPC");
			if(aData?.length>0){
				aData.forEach(item=>{
					if(item.id===sParam) value = item.descripcion;
				})
				return value;
			}else{
				return sParam;
			}
		},
		indPermiso:function(sParam){
			if(!sParam) return "";
			let sValue,
			oModelMaster = this.getView().getModel("DATOSMAESTRO"),
			aData = oModelMaster.getProperty("/INPMS");
			if(aData?.length>0){
				aData.forEach(item=>{
					if(item.id===sParam) sValue = item.descripcion;
				})
				return sValue;
			}else{
				return sParam;
			}
		},

		tipoHorometro:function(sParam){
			if(!sParam) return "";
			let sValue,
			oModelMaster = this.getView().getModel("DATOSMAESTRO"),
			aData = oModelMaster.getProperty("/CDTHR");
			if(aData?.length>0){
				aData.forEach(item=>{
					if(item.id===sParam) sValue = item.descripcion;
				})
				return sValue;
			}else{
				return sParam;
			}
		},
		estado:function(sParam){
			if(!sParam) return "";
			let sValue,
			oModelMaster = this.getView().getModel("DATOSMAESTRO"),
			aData = oModelMaster.getProperty("/ESREG");
			if(aData?.length>0){
				aData.forEach(item=>{
					if(item.id===sParam) sValue = item.descripcion;
				})
				return sValue;
			}else{
				return sParam;
			}
		}
	};
});