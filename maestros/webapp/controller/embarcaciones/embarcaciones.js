sap.ui.define([
	"sap/ui/base/ManagedObject",
    "sap/ui/core/BusyIndicator",
    "../../model/formatter"
], function(
    ManagedObject,
	BusyIndicator,
    formatter
) {
	"use strict";

	return ManagedObject.extend("com.tasa.maestros.controller.embarcaciones.embarcaciones", {
        constructor: function(oView,sNameFrag) {
            this._oView = oView;
            this._oControl = sap.ui.xmlfragment(oView.getId(), "com.tasa.maestros.fragments.embarcacion."+sNameFrag,this);
            this._bInit = false;
        },
        
        formatter: formatter,

        onInit: function() {
            this._oFragment = this.getControl();
        },
        
        onExit: function() {
            // BaseController.prototype.onExit.apply(this, arguments);
            this._oFragment.destroy();
        },

        getController:function(){
            return this.getView().getController();
        },
        getView: function() {
			return this._oView;
        },

        getControl:function(){
            return this._oControl;
        },

        open:function(){
            let oView = this._oView;
			let oControl = this._oControl;

            if (!this._bInit) {
				// Initialize our fragment
				this.onInit();
				this._bInit = true;
                oView.addDependent(oControl);
			}

			var args = Array.prototype.slice.call(arguments);
			if (oControl.open) {
				oControl.open.apply(oControl, args);
			} else if (oControl.openBy) {
				oControl.openBy.apply(oControl, args);
			}

        },

        close:function(){
            this._oControl.close();
            // this.onExit();
        },

        onEditarEmbarcacion:function(param){
            let oModelMaster = this.getController().getModel("DATOSMAESTRO"), 
            sNameFrag,
            oEditDialog;

            if(param?.sId === "press"){
                let oContextData = param.getSource().getBindingContext("DATOSMAESTRO"),
                oObject = oContextData.getObject();
                param = oContextData.getPath().split("/")[1];
                oModelMaster.setProperty(`/ITEM${param}`,oObject);
                oModelMaster.setProperty(`/typeRegEmb`,"edit");
            }else{
                oModelMaster.setProperty(`/ITEM${param}`,{});
                oModelMaster.setProperty(`/typeRegEmb`,"nuevo");
            }
            if(param==="s_ps") sNameFrag="EditPermisos";
            if(param==="s_ee") sNameFrag="EditEquip";
            if(param==="s_be") sNameFrag="EditBodegas";
            if(param==="str_hor") sNameFrag="EditHorometro";
            
            oEditDialog = this.getController().mFragEdit[sNameFrag]
            if(!oEditDialog){
                this.getController().setFragEmb(sNameFrag);
               oEditDialog = this.getController().mFragEdit[sNameFrag];
           }
           oEditDialog.open();
        },

         onSelectionItemTable:function(oEvent){
            let oItemSelected = oEvent.getParameter("listItem"),
            aItemsAll = oEvent.getParameter("listItems"),
            bSelected = oEvent.getParameter("selected"),
            bSelectedAll = oEvent.getParameter("selectAll"),
            sPathItemSel = oItemSelected.getBindingContext("DATOSMAESTRO").getPath(),
            sIndexSelected = sPathItemSel.split("/")[2],
            param = sPathItemSel.split("/")[1],
            oModelMaster = oEvent.getSource().getModel("DATOSMAESTRO"),
            aIndexSelected = oModelMaster.getProperty("/indexSelected")||[];
            if(bSelected){
                aIndexSelected.push(sIndexSelected)
            }else{
                let sIndex = aIndexSelected.findIndex(index=>index===sIndexSelected);
                aIndexSelected.splice(sIndex, 1);
            }
            oModelMaster.setProperty("/selectedAll",bSelectedAll);
            oModelMaster.setProperty("/indexSelected",aIndexSelected);
            oModelMaster.setProperty("/param",param);
            
         },
         
         onEliminarRegistroE:function(oEvent){
             let oModelMaster = this.getController().getModel("DATOSMAESTRO"),
             oTable = oEvent.getSource().getParent().getParent(),
             aIndexSelected = oModelMaster.getProperty("/indexSelected"),
            bSelectedAll =  oModelMaster.getProperty("/selectedAll"),
            param = oModelMaster.getProperty("/param"),
            aData = oModelMaster.getProperty("/"+param);

            if(aIndexSelected?.length>0||bSelectedAll){
                if(bSelectedAll){
                    oModelMaster.setProperty("/"+param,[]);
                }else{
                    let flag=0;
                    aIndexSelected.forEach(sIndex=>{
                        aData.splice(sIndex-flag, 1)
                        flag++;
                    })
                }
                oModelMaster.setProperty("/selectedAll",false);
                oModelMaster.setProperty("/indexSelected",[]);
                oTable.removeSelections(true);
            }else{
                this.getController().getMessageDialog("Warning","Seleccione por lo menos un registro");
            }
         },

         onGuardarEdit:function(sParam){
            let oModelMaster = this.getController().getModel("DATOSMAESTRO"),
            sTypeRegEmb = oModelMaster.getProperty(`/typeRegEmb`),
            oData = oModelMaster.getProperty(`/ITEM${sParam}`),
            aData=oModelMaster.getProperty(`/${sParam}`)||[],
            codEmb = oModelMaster.getProperty(`/codEmbar`);

            oData.CDEMB = codEmb||"";

            if(sTypeRegEmb==="nuevo"){
                if(sParam==="s_ps") aData = this.savePermisos(oModelMaster,oData,aData);
                if(sParam==="s_ee") aData = this.saveEquipamiento(oModelMaster,oData,aData);
                // if(sParam==="s_pe") this.savePerm(oModelMaster,sParam);
                if(sParam==="s_be") aData = this.saveBodegas(oModelMaster,oData,aData);
                if(sParam==="str_hor") aData = this.saveHorometros(oModelMaster,oData,aData);
            }
            
            oModelMaster.setProperty(`/${sParam}`,aData);
            this.close()
         },

         savePermisos:function(oModelMaster,oData,aData){
            // let codTipPesca = oData.CDTPC,
            // aTipoPesca = oModelMaster.getProperty(`/CDTPC`),
            // descTipPesca=aTipoPesca.find(item=>{
            //     if (item.id===codTipPesca) return item;
            // });
            // oData.DESC_CDTPC = descTipPesca.descripcion||'';
            aData.push(oData);
            return aData;
         },

         saveEquipamiento:function(oModelMaster,oData,aData){
            aData.push(oData);
            return aData;
         },

         saveBodegas:function(oModelMaster,oData,aData){
            let codBodega = oData.CDBOD,
            aBodegas = oModelMaster.getProperty(`/CDBOD`),
            descBodega=aBodegas.find(item=>{
                if (item.id===codBodega) return item;
            });
            oData.DSBOD = descBodega.descripcion||'';
            aData.push(oData);
            return aData;
         },

         saveHorometros:function(oModelMaster,oData,aData){
            let codEstado = oData.ESREG,
            aEstados = oModelMaster.getProperty(`/ESREG`),
            descEstado=aEstados.find(item=>{
                if (item.id===codEstado) return item;
            });
            oData.DESC_ESREG = descEstado.descripcion||'';
            aData.push(oData);
            return aData;
         },

         onSeletedItemSuggest:function(oEvent){
             let oModelMaestro = this.getController().getModel("DATOSMAESTRO"),
             oContext = oEvent.getParameter("selectedRow").getBindingContext("AYUDABUSQUEDA"),
             oItem = oContext.getObject(),
             sPath = oEvent.getSource().getBindingContext("DATOSMAESTRO").getPath(),
             aKeys = Object.keys(oItem),
             aDescriptions = ["DSSPC","DSEQP","DSUMD","EQKTX"],
             aDesc = aDescriptions.filter(item=>{
                 return aKeys.find(key=>key===item);
             }),
             sDescription;
             aDesc.forEach(desc=>{
                 sDescription = oItem[desc];
                 oModelMaestro.setProperty(sPath+"/"+desc,sDescription);
             })
         }

	});
});