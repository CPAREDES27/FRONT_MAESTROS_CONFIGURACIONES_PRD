sap.ui.define([
	"sap/ui/base/ManagedObject",
    "sap/ui/unified/library",
	"sap/m/library"
], function(
	ManagedObject,
    unifiedLibrary, 
    mLibrary
) {
	"use strict";
    var StandardCalendarLegendItem = unifiedLibrary.StandardCalendarLegendItem;

	return ManagedObject.extend("com.tasa.config.controller.CalendarioPesca", {
        constructor: function(oView,sFragName) {
			this._oView = oView;
			this._oControl = sap.ui.xmlfragment(oView.getId(), 
                "com.tasa.config.fragments.CalendarioPesca."+sFragName, this);
			this._bInit = false;
		},

		exit: function() {
			delete this._oView;
		},

		getView: function() {
			return this._oView;
        },
        
        getController:function(){
            return this.getView().getController();
        },

		getControl: function() {
			return this._oControl;
		},

		getOwnerComponent: function() {
			return this._oView.getController().getOwnerComponent();
		},

		openBy: function() {
			var oView = this._oView;
			var oControl = this._oControl;
			if (!this._bInit) {
				// Initialize our fragment
				this.onInit();
				this._bInit = true;
			}
			// var args = Array.prototype.slice.call(arguments);
			// if (oControl.open) {
			// 	oControl.open.apply(oControl, args);
			// } else if (oControl.openBy) {
			// 	oControl.openBy.apply(oControl, args);
			// }
		},

		close: function(oEvent) {
            this._oControl.close();
		},

		setRouter: function(oRouter) {
			this.oRouter = oRouter;
		},
		getBindingParameters: function() {
			return {};
		},
		onInit: function() {
			this._oFragment = this.getControl();
		},
		onExit: function() {
			this._oFragment.destroy();
        },

        formatter:function(sFecha){
            return this.getController().setFormatDate(sFecha);
        },

        makeRandomId:function(length) {
            let result = ''
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            for (let i = 0; i < length; i++ ) {
              result += characters.charAt(Math.floor(Math.random() * characters.length));
           }
           return result;
        },

        onPressCell:function(oEvent){
            let nowDate = new Date,
            fecha1 = oEvent.getParameter("endDate"),
            fecha2 = oEvent.getParameter("startDate"),
            oModelMaster = this.getController().getModel("DATOSMAESTRO"),
            aDataAppointment=oModelMaster.getProperty("/appointments"),
            oAppointment;
            if(nowDate<=fecha1){
                oModelMaster.setProperty("/fecha1",fecha1);
                oModelMaster.setProperty("/fecha2",fecha2);
                oModelMaster.setProperty("/fechaActual",this.getController().setFormatDate(fecha1));
                let oDialogAddTemp = this.getController().mFragments["AddTempPesca"];
                if(!oDialogAddTemp){
                    oDialogAddTemp = this.getController().buildCalendarioPesca("AddTempPesca");
                }
                let oControl = oDialogAddTemp.getControl();
                this.getView().addDependent(oControl);
               //  oControl.open();
                oControl.bindElement("DATOSMAESTRO>/appointments")
                oAppointment={
                   id:  this.makeRandomId(4),
                   CDTPC: "Añadir temporada",
                   texto: "",
                   type: sap.ui.unified.CalendarDayType.Type20,
                   startDate: fecha1,
                   endDate: fecha1,
                   tipoPesca:"",
                   especie:"",
                   latInicioGrad:"",
                   latInicioMin:"",
                   longInicioGrad:"",
                   longInicioMin:"",
                   latFinGrad:"",
                   latgFinMin:"",
                   longFinGrad:"",
                   longFinMin:"",
                   icon:"sap-icon://add",
                   status:"0"
                }
                let sFechaComp = new Date(oAppointment.startDate),
                sFecha1;
                sFechaComp = sFechaComp.getFullYear()+"/"+sFechaComp.getMonth()+"/"+sFechaComp.getDate();
                let oAppointExist = aDataAppointment.find(oAppoint=>{
                    let sFecha1 = new Date(oAppoint.startDate);
                    sFecha1 = sFecha1.getFullYear()+"/"+sFecha1.getMonth()+"/"+sFecha1.getDate();
                    if(oAppoint.status==="0"&&sFechaComp===sFecha1){
                        return oAppoint;
                    }
                });
                if(oAppointExist){
                    this.getController().getMessageDialog("Warning","Solo puede seleccionar por tipo de pesca");
                    return;
                }else{
                    aDataAppointment.push(oAppointment);
                }
                oModelMaster.setProperty("/appointments",aDataAppointment),
                oModelMaster.refresh(true);
            }else{
               this.getController().getMessageDialog("Information","No puede agregar temporada");
               return;
            }
        },

        /**
         * Seleccion de fecha en Calendario principal
         * @param {*} oEvent 
         * @returns 
         */
        onPressCalendar:function(oEvent){
            let oModelView = this.getController().getModel("detailView");
            if(oModelView.getProperty("/visibleButtonAdd")&&!oModelView.getProperty("/visibleButtonEnable")){
                let oCalendar = oEvent.getSource(),
                sStartDate = oEvent.getParameter("startDate"),
                sEndDate = oEvent.getParameter("endDate"),
                oLegend = this.getView().byId("legend"),
                oModelMaster = this.getController().getModel("DATOSMAESTRO"),
                aSpecialDate = oModelMaster.getProperty("/specialDates")||[],
                aLegendItems = oModelMaster.getProperty("/legendItems")||[],
                oLegendItem = {},
                oNewTemp = new Object,
                oCurrentDate = new Date,
                sFecha=this.getController().setStringDate(sStartDate);
                
                let sFechaActual = this.getController().setDate(oCurrentDate),
                sFechaSelec = this.getController().setDate(sStartDate);
                
                if(sFechaActual<=sFechaSelec){
                    // Eliminar seleccion
                    let sDate,
                    oIndexSpecial = aSpecialDate.findIndex((oItem,sIndex)=>{
                        sDate = oItem.startDate;
                        sDate = this.getController().setStringDate(oItem.startDate);
                        if(sDate===sFecha&&oItem.status==="0") return sIndex;
                    })
    
                    if(oIndexSpecial>0) {
                        let aItemRemoved = aSpecialDate.splice(oIndexSpecial,1),
                        aLegendIndex = aLegendItems.findIndex((oItem,index)=>{
                            if(aItemRemoved[0].id===oItem.id) return index;
                        });
                        aLegendItems.splice(aLegendIndex, 1);
                        // devolvemos el type 
                        aSpecialDate.forEach(oItem=>{
                            let oDate = this.getController().setStringDate(oItem.startDate);
                            if(oDate===sFecha) oItem.type="Type02"
                        })
                        oModelMaster.setProperty("/specialDates",aSpecialDate);
                        oModelMaster.setProperty("/legendItems",aLegendItems);
                        return;
                    }
    
                    // agregar Seleccion
                    oNewTemp.startDate = sStartDate;
                    oNewTemp.endDate = sStartDate;
                    oNewTemp.type = "Type09";
                    oNewTemp.status = "0";
                    oNewTemp.id = this.makeRandomId(4);
    
                    // cambiamos el type de seleccionado
                    aSpecialDate.forEach(oItem=>{
                        let oDate = this.getController().setStringDate(oItem.startDate);
                        if(oDate===sFecha) oItem.type=oNewTemp.type
                    })
                    // actualizamos Special Dates
                    aSpecialDate.push(oNewTemp)
                    oModelMaster.setProperty("/specialDates",aSpecialDate);
    
                    // agregamos proipiedades a los items de la leyenda
                    oLegendItem.id = oNewTemp.id;
                    oLegendItem.text = "Agregar temporada "+sFecha;
                    oLegendItem.type = "Type09";
                    aLegendItems.push(oLegendItem);
                    oModelMaster.setProperty("/legendItems",aLegendItems);

                }else{
                    this.getController().getMessageDialog("Warning","No se puede seleccionar")
                }
            }
            
        },

        onPressAppointment:function(oEvent){
            const oAppointment = oEvent.getParameter("appointment");
            let oActionSheet = oAppointment.getDependents()[0],
            oContext = oAppointment.getBindingContext("DATOSMAESTRO");
            oActionSheet.openBy(oAppointment);
            oActionSheet.bindElement("DATOSMAESTRO>"+oContext.getPath())
            // this.onShowDetail(oEvent);
        },
            
        // handleAppointmentSelect:function(oEvent){
        //     if(oAppointment){
        //         // const oDialogAddTemp = this.getController().mFragments["AddTempPesca"];
        //         let oActionSheet = oAppointment.getDependents()[0],
        //         oContext = oAppointment.getBindingContext("DATOSMAESTRO");
        //         oActionSheet.openBy(oAppointment);
        //         oActionSheet.bindElement("DATOSMAESTRO>"+oContext.getPath());
 
        //     }
        // },
        closeDialog:function(oEvent){
            oEvent.getSource().getParent().close();
            let oModelMaster = this.getController().getModel("DATOSMAESTRO");
            oModelMaster.setProperty("/selectedTipoPesca","");
            oModelMaster.setProperty("/especie","");
            oModelMaster.setProperty("/latInicioGrad","");
            oModelMaster.setProperty("/latInicioMin","");
            oModelMaster.setProperty("/latFinGrad","");
            oModelMaster.setProperty("/latFinMin","");
            oModelMaster.setProperty("/longInicioGrad","");
            oModelMaster.setProperty("/longInicioMin","");
            oModelMaster.setProperty("/longFinGrad","");
            oModelMaster.setProperty("/longFinMin","");
        },

        /**
         *  Guardar temporadas 
         * @param {*} oEvent 
         * @returns 
         */
        onSaveTemp:function(oEvent){
            let oModelMaster = this.getController().getModel("DATOSMAESTRO"),
            oModelView = this.getController().getModel("detailView"),
            bSaveData1 = oModelMaster.getProperty("/bSaveData1"),
            bSaveData2 = oModelMaster.getProperty("/bSaveData2"),
            bSaveData3 = oModelMaster.getProperty("/bSaveData3"),
            bSaveData4 = oModelMaster.getProperty("/bSaveData4"),
            bSaveData5 = oModelMaster.getProperty("/bSaveData5"),
            oModelHelp = this.getController().getModel("AYUDABUSQUEDA"),
            aSpecialDate=oModelMaster.getProperty("/specialDates"),
            aDataTipoPesca = oModelMaster.getProperty("/CDTPC"),
            aDataEspecie = oModelHelp.getProperty("/B12"),
            oMaster = oEvent.getSource().getBindingContext().getObject(),
           
            // recogemos los datos
            sCodPesca = oModelMaster.getProperty("/selectedTipoPesca"),
            sCodEspecie = oModelMaster.getProperty("/especie"),
            sLatInicioGrad = oModelMaster.getProperty("/latInicioGrad"),
            slatInicioMin = oModelMaster.getProperty("/latInicioMin"),
            slatFinGrad = oModelMaster.getProperty("/latFinGrad"),
            slatFinMin = oModelMaster.getProperty("/latFinMin"),
            slongInicioGrad = oModelMaster.getProperty("/longInicioGrad"),
            slongInicioMin = oModelMaster.getProperty("/longInicioMin"),
            slongFinGrad = oModelMaster.getProperty("/longFinGrad"),
            slongFinMin = oModelMaster.getProperty("/longFinMin"),
            
            sFecha,
            sTipoPesca,
            sEspecie;

            //validaciones
            if(!sCodPesca||!sCodEspecie||!sLatInicioGrad||!slatInicioMin||!slatFinGrad){
                this.getController().getMessageDialog("Error","¡Hay campos vacíos!");
                return;
            }
            if(!slatFinMin||!slongInicioGrad||!slongInicioMin||!slongFinGrad||!slongFinMin){
               this.getController().getMessageDialog("Error","¡Hay campos vacíos!");
               return;
            }

            if(!bSaveData1||!bSaveData2||!bSaveData3||!bSaveData4||!bSaveData5){
               this.getController().getMessageDialog("Error","Existen datos no válidos");
               return;
           }

            aDataTipoPesca.forEach(item=>{
                if(item.id===sCodPesca){
                    sTipoPesca = item.descripcion
                }
            });
            aDataEspecie.forEach(item=>{
                if(item.CDSPC===sCodEspecie){
                   sEspecie=item.DSSPC
                }
            });
           let aNewTemp = aSpecialDate.filter(oAppoint=>oAppoint.status==="0");
           aNewTemp.forEach(item=>{
               sFecha=item.startDate;
               item.icon="sap-icon://accept";
               item.title=sTipoPesca;
               item.texto=sEspecie;
               item.type = "Type03";
               item.CDTPC=sCodPesca;
               item.FHCAL=sFecha;
               item.LNINI=`${slongInicioGrad}${slongInicioMin}`;
               item.LGFIN=`${slongFinGrad}${slongFinMin}`;
               item.LTINI=`${sLatInicioGrad}${slatInicioMin}`;
               item.LTFIN=`${slatFinGrad}${slatFinMin}`;
               item.MILLA="0.000";
               item.status="1";
           })
            oEvent.getSource().getParent().close();
            oModelMaster.refresh(true);

            let aBody=[],
            fecha;
            aNewTemp.forEach(item=>{
                fecha = item.startDate;
                aBody.push(
                   {
                       FHCAL:this.getController().paramDate(fecha),
                       CDTPC:sCodPesca,
                       CDSPC:sCodEspecie,
                       // DSSPC:sEspecie,
                       LTINI:`${sLatInicioGrad}${slatInicioMin}`,
                       LTFIN:`${slatFinGrad}${slatFinMin}`,
                       LNINI:`${slongInicioGrad}${slongInicioMin}`,
                       LGFIN:`${slongFinGrad}${slongFinMin}`,
                       MILLA:"0.000"
                   }
               )
            })

            let oService={
                p_user:"FGARCIA",
                t_cal:aBody
            };

            this.getController()._saveTemporadaPesca(oMaster,oService,fecha);
            this.close();
            // limpiar campos
            oModelMaster.setProperty("/selectedTipoPesca","");
            oModelMaster.setProperty("/especie","");
            oModelMaster.setProperty("/latInicioGrad","");
            oModelMaster.setProperty("/latInicioMin","");
            oModelMaster.setProperty("/latFinGrad","");
            oModelMaster.setProperty("/latFinMin","");
            oModelMaster.setProperty("/longInicioGrad","");
            oModelMaster.setProperty("/longInicioMin","");
            oModelMaster.setProperty("/longFinGrad","");
            oModelMaster.setProperty("/longFinMin","");

            //configuraciones para Motrar Legend
            oModelView.setProperty("/visibleButtonAdd",false);
            oModelView.setProperty("/visibleButtonEnable",true);
            oModelView.setProperty("/legendShown",false);
            oModelMaster.setProperty("/legendItems",[]);
            
       },


       onShowDetail:function(oEvent){
           if(!this.oAppointDetail){
               this.oAppointDetail=new sap.ui.core.Fragment.load({
                   name:"com.tasa.config.fragments.CalendarioPesca.AppointDetail2",
                   controller:this
               }).then(oDialog=>{
                   this.getView().addDependent(oDialog)
                   return oDialog;
               })
           }
            // let oAppointmentContext = oEvent.getParameter("appointment").getBindingContext("DATOSMAESTRO");
            let oAppointmentContext = oEvent.getSource().getBindingContext("DATOSMAESTRO");
            this.oAppointDetail.then(oDialog=>{
               oDialog.bindElement("DATOSMAESTRO>"+oAppointmentContext.getPath());
               oDialog.open();
           })
       },

        onAppoimentDelete:function(oEvent){
            let oContext = oEvent.getSource().getBindingContext("DATOSMAESTRO"),
            aDataAppointment = oContext.getModel().getProperty("/datosCalendarios"),
            oModelHelp = this.getController().getModel("AYUDABUSQUEDA"),
            oObject = oContext.getObject(),
            sIndex = aDataAppointment.findIndex(oAppoint=>oAppoint.id===oObject.id),
            oModelMaster = oContext.getModel(),
            aDataTipoPesca = oModelMaster.getProperty("/CDTPC"),
            aDataEspecie = oModelHelp.getProperty("/B12"),
            oMaster = oEvent.getSource().getParent().getBindingContext().getObject(),
            sCodTipoPesca;
            
            if(oObject.status==="0"){
                aDataAppointment.splice(sIndex,1)
                oModelMaster.setProperty("/appointments",aDataAppointment);
            }else{
                aDataTipoPesca.forEach(item=>{
                    if(item.descripcion===oObject.CDTPC){
                        sCodTipoPesca = item.id
                    }
                });
                let sLatIni = oObject.LTINI.slice(0,3)+oObject.LTINI.slice(4,6),
                sLatFin = oObject.LTFIN.slice(0,3)+oObject.LTFIN.slice(4,6),
                sLonIni = oObject.LNINI.slice(0,3)+oObject.LNINI.slice(4,6),
                sLonFin = oObject.LGFIN.slice(0,3)+oObject.LGFIN.slice(4,6);
                let oBody={
                    i_table: "ZFLCLT",
                    p_user: "FGARCIA",
                    t_data: `|${oObject.FHCAL}|${oObject.CDTPC}|${oObject.CDSPC}|${sLatIni}|${sLonIni}|${sLatFin}|${sLonFin}`
                    // t_data: `|${oObject.FHCAL}|${sCodTipoPesca}|||||`
                }

                //tratamiento de fechas 
                let sDate = oObject.FHCAL,
                oFecha = new Date(sDate.slice(0,4),(sDate.slice(4,6)-1),sDate.slice(6));
                this.getController()._eliminarTemporadaPesca(oMaster,oBody,oFecha);
                this.closeDialog(oEvent);

            }

        },

        /**
         * Abrir dialogo para editar temporadas
         * @param {*} oEvent 
         */
        handleAppointmentCreate:function(oEvent){
            let oModelMaster = this.getController().getModel("DATOSMAESTRO"),
            oModelView = this.getController().getModel("detailView"),
            oModelHelp = this.getController().getModel("AYUDABUSQUEDA"),
            oDialogAddTemp = this.getController().mFragments["AddTempPesca"],
            aTipPesca=oModelMaster.getProperty("/tipoPesca"),
            aSpecialDate = oModelMaster.getProperty("/specialDates"),
            aNewTemp = aSpecialDate.filter(oItem=>oItem.status==="0");
            if(aNewTemp.length>0){
                if(!oDialogAddTemp){
                    oDialogAddTemp = this.getController().buildCalendarioPesca("AddTempPesca");
                    this.getView().addDependent(oDialogAddTemp.getControl());
                };
                let oCalendarDays = this.getView().byId("calendarDias"),
                fecha,
                aSelectedDates=[];
                aNewTemp.forEach(oItem=>{
                    fecha = new sap.ui.unified.DateRange({
                        startDate:oItem.startDate
                    });
                    oCalendarDays.addSelectedDate(fecha);
                    aSelectedDates.push({
                        Date:this.getController().setFormatDate(oItem.startDate)
                    })
                })
                oModelMaster.setProperty("/selectedDates",aSelectedDates);
                oModelMaster.setProperty("/selectedTipoPesca","I");

                let oDate = new Date,
                startDate = new Date(oDate.getFullYear(),oDate.getMonth()+1,1),
                endDate = new Date(oDate.getFullYear(),oDate.getMonth()+1,32);

                oModelMaster.setProperty("/startDateDisabled",startDate);
                oModelMaster.setProperty("/endDateDisabled",endDate);
                oDialogAddTemp.getControl().open();
                
            }else{
                this.getController().getMessageDialog("Warning","Seleccione por lo menos un día");
            }
        },

        onInputChange:function(oEvent){
            let oModelMaster = this.getController().getModel("DATOSMAESTRO"),
            aDatavalid = oModelMaster.getProperty("/validaciones"),
            oInput = oEvent.getSource(),
            sValue = oEvent.getParameter("value"),
            sBinding = oEvent.getSource().getBindingPath("value").split("/")[1],
            oInputValues={
                latInicioGrad : ["latFinGrad","MoI","4","5","VAL01"],
                latInicioMin : ["latFinMin","moi","4","5","VAL02"],
                latFinGrad : ["latInicioGrad","M","4","5","VAL01"],
                latFinMin : ["latInicioMin","m","4","5","VAL02"],
                longInicioGrad : ["longFinGrad","MoI","6","7","VAL01"],
                longInicioMin : ["longFinMin","moi","6","7","VAL02"],
                longFinGrad : ["longInicioGrad","M","6","7","VAL01"],
                longFinMin : ["longInicioMin","m","6","7","VAL02"],
            },
            oItemValidMin,
            oItemValidMax,
            sLimInf,
            sLimSup,
            sValue1 = oModelMaster.getProperty("/"+oInputValues[sBinding][0]),
            latInicioGrad = oModelMaster.getProperty("/latInicioGrad"),
            latFinGrad = oModelMaster.getProperty("/latFinGrad"),
            longInicioGrad = oModelMaster.getProperty("/longInicioGrad"),
            longFinGrad = oModelMaster.getProperty("/longFinGrad");

            oModelMaster.setProperty("/bSaveData1",true);
            oModelMaster.setProperty("/bSaveData2",true);
            oModelMaster.setProperty("/bSaveData3",true);
            oModelMaster.setProperty("/bSaveData4",true);
            oModelMaster.setProperty("/bSaveData5",true);

            oItemValidMin=aDatavalid.find(item=>item.CDCNS===oInputValues[sBinding][2]);
            oItemValidMax=aDatavalid.find(item=>item.CDCNS===oInputValues[sBinding][3]);
            let sValMin = oItemValidMin[oInputValues[sBinding][4]],
            sValMax = oItemValidMax[oInputValues[sBinding][4]];

            if(sBinding==="latInicioGrad"||sBinding==="latFinGrad"){
                sLimInf=sValMin;
                sLimSup=sValMax;
            }
            if(sBinding==="longInicioGrad"||sBinding==="longFinGrad"){
                sLimInf=sValMin;
                sLimSup=sValMax;
            }

            if(sBinding==="latInicioMin"||sBinding==="longInicioMin"){
                sLimInf="00"
                sLimSup = "59";
            }

            if(sBinding==="latFinMin"||sBinding==="longFinMin"){
                sLimInf="00"
                sLimSup=latFinGrad==="018"?sValMax:"59"
            }
            

            if(Number(sValue)<Number(sLimInf)||Number(sValue)>Number(sLimSup)){
                oInput.setValueState("Error");
                oInput.setValueStateText("Valores deben estar entre "+sValMin+" y "+sValMax);
                oModelMaster.setProperty("/bSaveData1",false);
                return;    
            }else{
                oInput.setValueState("None");
                oInput.setValueStateText("");
                oModelMaster.setProperty("/bSaveData1",true);
            }

            if(sValue1){
                if(oInputValues[sBinding][1]==="MoI"){
                    if(Number(sValue)>Number(sValue1)){
                        oInput.setValueState("Error");
                        oInput.setValueStateText(sValue+" debe ser menor o igual que  "+sValue1);
                        oModelMaster.setProperty("/bSaveData2",false);
                        return;
                    }else{
                        oInput.setValueState("None");
                        oInput.setValueStateText("");
                        oModelMaster.setProperty("/bSaveData2",true);
                    }
                }else if(oInputValues[sBinding][1]==="M"){
                    if(Number(sValue)<Number(sValue1)){
                        oInput.setValueState("Error");
                        oInput.setValueStateText(sValue+" debe mayor que  "+sValue1);
                        oModelMaster.setProperty("/bSaveData3",false);
                        return;
                    }else{
                        oInput.setValueState("None");
                        oInput.setValueStateText("");
                        oModelMaster.setProperty("/bSaveData3",true);
                    }
                }else{
                    if(latInicioGrad&&latFinGrad||longInicioGrad&&longFinGrad){
                        if(Number(latInicioGrad)===Number(latFinGrad)||Number(longInicioGrad)===Number(longFinGrad)){
                            if(oInputValues[sBinding][1]==="moi"){
                                if(Number(sValue)>=Number(sValue1)){
                                    oInput.setValueState("Error");
                                    oInput.setValueStateText(sValue+" debe ser menor que  "+sValue1);
                                    oModelMaster.setProperty("/bSaveData4",false);
                                    return;
                                }else{
                                    oInput.setValueState("None");
                                    oInput.setValueStateText("");
                                    oModelMaster.setProperty("/bSaveData4",true);
                                }
                            }else if(oInputValues[sBinding][1]==="m"){
                                if(Number(sValue)<=Number(sValue1)){
                                    oInput.setValueState("Error");
                                    oInput.setValueStateText(sValue+" debe mayor que  "+sValue1);
                                    oModelMaster.setProperty("/bSaveData5",false);
                                    return;
                                }else{
                                    oInput.setValueState("None");
                                    oInput.setValueStateText("");
                                    oModelMaster.setProperty("/bSaveData5",true);
                                }
                            }
                        }
                    }
                }
                
            }
        },

        /**
         * Navegar por el calendario
         * @param {oEvent} oEvent 
         */
        handleStartDateChange:function(oEvent){
            let oCalendar = oEvent.getSource(),
            sStartDate = oCalendar.getStartDate(),
            oContext=oCalendar.getBindingContext();
            if(!oContext) oContext = this.getView().getBindingContext();
            let oMaster=oContext.getObject();
            this.getController()._getTemporadaPesca(oMaster,sStartDate);
            oCalendar.setStartDate(new Date());
        },

        /**
         *  Deshabilitar calendario de Agregar temporada
         */
        onSelectedDates:function(oEvent){
            var oCalendar = oEvent.getSource(),
                aSelectedDates = oCalendar.getSelectedDates(),
                oModelMaster = this.getController().getModel("DATOSMAESTRO"),
                aSelectedDatesModel = oModelMaster.getProperty("/selectedDates"),
                iLength = aSelectedDatesModel.length;
            if(aSelectedDates.length>iLength){
                oCalendar.removeSelectedDate(aSelectedDates.pop())
            }
        },

        handleDatePickerChange:function(oEvent){
            let fechaInicial = oEvent.getParameter("from"),
            fechaFin = oEvent.getParameter("to"),
            oModelMaster = this.getController().getModel("DATOSMAESTRO");
            oModelMaster.setProperty("/fechaInicio",fechaInicial);
            oModelMaster.setProperty("/fechaFinal",fechaFin)
        },

        onEnabledAdd:function(oEvent){
            let oModelView = this.getController().getModel("detailView");
            // if(oModelView.getProperty("/visibleButtonAdd")){
            //     oModelView.setProperty("/visibleButtonAdd",false);
            //     oModelView.setProperty("/visibleButtonEnable",true);
            //     oModelView.setProperty("/legendShown",false)
            // }else{
                oModelView.setProperty("/visibleButtonAdd",true)
                oModelView.setProperty("/visibleButtonEnable",false);
                oModelView.setProperty("/legendShown",true)
            // }
        }
	});
});