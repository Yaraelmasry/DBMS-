// Beginning of Boilerplate
const express = require('express');
const fs = require("fs");
const app = express();
const WebSocket = require('ws')
const http = require('http')
const path = require('path');
const { Client } = require('pg')
const config = require('./config.json')
const client = new Client(config)
client.connect()


app.use(express.static(__dirname + "/public"));

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});
app.get('/receptionist',function(req,res){
    res.sendFile(path.join(__dirname, 'public/receptionist.html'));
});
app.get('/dentist',function(req,res){
    res.sendFile(path.join(__dirname, 'public/doctor.html'));
});
app.get('/patient',function(req,res){
    res.sendFile(path.join(__dirname, 'public/patient.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({server})

//End of Server boilerplate, Database interactionc code follows.

// Show the list dentists in each branch.
// -> dentists 
//(receptionist.html line 477 to 506, Server.js 166 to 170)
// Add new patients
// -> newpatient 
// (receptionist.html line 356 to 421, Server.js 84 to 121)
// Check upcoming appointment with the dentist
// -> appointments 
// (patient.html line 153 to 173, Server.js 183 to 187 )
// Set a new appointment
// -> newappointment 
// (receptionist 316 to 355, Server.js 142 to 146)
// Add a new employee
// -> newemployee 
// (receptionist.html line 422 to 427, Server.js 147 to 160)
// Check the types of procedures available

// We're missing example 6



// Receptionist UI: 
    // add patient information, 
    // -> newpatient
    // (receptionist.html line 356 to 421, Server.js 84 to 121)
    // edit patient information, 
    // -> updatepatient
    // (receptionist.html line 376 to 421, Server.js 129 to 134)
    // set patient appointments.
    // -> newappointment
    // (receptionist 316 to 355, Server.js 142 to 146)
// Dentists/Hygienist UI: 
    // access the records of appointed patients easily.
    // -> medicalhistory
    // (doctor.html line 313 to 329, 212 to 215, Server.js 180 to 184, 190 to 194)

// Patient UI: 
    // access to their records,
    // -> medicalHistoryPatient
    // (patient.html line 155 to 173, Server.js 199 to 203 )
    // upcoming appointments with the dentists.
    // -> appointments
    // (patient.html line 155 to 173, Server.js 194 to 196 )


wss.on('connection', function connection(ws) {
    // Routing the WebSocket packets to the appropriate functions.
    // The functions will use the proper SQL queries to update the database, given the data received.
    ws.on('message', function incoming(message) {
        message = JSON.parse(message);
        if(message.type=="login"){
            if(message.role=="Receptionist"){
                ws.send(JSON.stringify({type:"redirect",path:"receptionist"}));
            }
            else if(message.role=="Doctor"){
                ws.send(JSON.stringify({type:"redirect",path:"dentist"}));
            }
            else if(message.role=="Patient"){
                ws.send(JSON.stringify({type:"redirect",path:"patient"}));
            }
        }
        else if(message.type=="newpatient"){
             client.query("INSERT INTO public.\"User\"(\"sinNumber\", \"firstName\", \"middleName\", \"lastName\", \"birthDate\", \"pronouns\", \"houseNumber\", \"street\", \"city\", \"province\", \"postalCode\", \"gender\", \"contactEmail\", \"contactNumber\") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"
             ,[message.ssn, message.firstName, message.middleName, message.lastName, message.dateOfBirth,message.pronouns, message.houseNumber, message.street, message.city, message.province, message.postalCode, message.gender, message.email, message.phoneNumber],(err,res)=>{
                 if (err){
                     console.log(err);
                 }
             });
             if (message.guardianSin != ""){
                if (message.insuranceProvider != ""){
                    client.query("INSERT INTO public.\"Patient\"(\"sinNumber\", \"insuranceProvider\", \"insurancePlanCode\", \"guardianSin\") VALUES ($1, $2, $3, $4)", [message.ssn, message.insuranceProvider, message.insurancePlanCode, message.guardianSin], (err, res) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                }else{
                    client.query("INSERT INTO public.\"Patient\"(\"sinNumber\", \"guardianSin\") VALUES ($1, $2)", [message.ssn, message.guardianSin], (err, res) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
             }else{
                if (message.insuranceProvider != ""){
                    client.query("INSERT INTO public.\"Patient\"(\"sinNumber\", \"insuranceProvider\", \"insurancePlanCode\") VALUES ($1, $2, $3)", [message.ssn, message.insuranceProvider, message.insurancePlanCode], (err, res) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                }else{
                    client.query("INSERT INTO public.\"Patient\"(\"sinNumber\") VALUES ($1)", [message.ssn], (err, res) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
             }

        }
        else if(message.type=="updatepatient"){
            // Update patient table 
            client.query('UPDATE public."User" SET "firstName" = $1, "middleName" = $2, "lastName" = $3, "houseNumber" = $4, "street" = $5, "city" = $6, "province" = $7, "gender" = $8, "sinNumber" = $9, "birthDate" = $10, "contactNumber" = $11, "contactEmail" = $12, "pronouns"=$13, "postalCode"=$14  WHERE "sinNumber" = $15',[message.firstName, message.middleName, message.lastName, message.houseNumber, message.street, message.city, message.province, message.gender, message.ssn, message.dateOfBirth, message.phoneNumber, message.email, message.pronouns, message.postalCode, message.ssn],(err,res)=>{
                if (err)console.log(err);
            });
        }
        else if (message.type == "appointments"){
            appointments = []
            patientQuery = {text : "SELECT * from public.\"Appointment\" WHERE patient_sin = $1",values : [message.sin],rowMode : "array"}
            dentistQuery = {text : "SELECT * from public.\"Appointment\" WHERE dentist_sin = $1",values : [message.sin],rowMode : "array"}
            generalQuery = {text : "SELECT * from ((public.\"Appointment\" apt INNER JOIN public.\"User\" u ON u.\"sinNumber\" = apt.\"patientSin\") INNER JOIN public.\"User\" u2 ON u2.\"sinNumber\" = apt.\"dentistSin\")",rowMode : "array"}
            message.caller == "patient" ? client.query(patientQuery,(err,res)=>{if (err)console.log(err.stack);else{appointments = res.rows;ws.send(JSON.stringify({type:"appointments",appointments:JSON.stringify(appointments)}))}})
            : message.caller == "dentist" ? client.query(dentistQuery,(err,res)=>{if (err)console.log(err.stack);else{appointments = res.rows;ws.send(JSON.stringify({type:"appointments",appointments:JSON.stringify(appointments)}))}})
            : client.query(generalQuery,(err,res)=>{if (err)console.log(err.stack);appointments = res.rows;ws.send(JSON.stringify({type:"appointments",appointments:JSON.stringify(appointments)}))});
        }
        else if (message.type == "updateappointment"){
            client.query('UPDATE public."Appointment" SET "patientSin" = $1, "dentistSin" = $2, "date" = $3, "startTime" = $4, "endTime" = $5, "appointmentType" = $6, "appointmentStatus" = $7, "roomAssigned" = $8 WHERE "patientSin" = $9 AND "dentistSin" = $10 AND "date" = $11 AND "startTime" = $12 AND "endTime" = $13',
            [message.patientSin, message.dentistSin, message.date, message.startTime, message.endTime, message.appointmentType, message.appointmentStatus, message.roomAssigned, message.patientSin, message.dentistSin, message.date, message.startTime, message.endTime],(err,res)=>{if (err)console.log(err.stack);else{console.log(res);}});
        }
        else if (message.type == "newappointment"){
            client.query('INSERT INTO public."Appointments"("patientSin","dentistSin","date","startTime","endTime","appointmentType","appointmentStatus","roomAssigned") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',[message.patientSin, message.doctorSin, message.date, message.startTime, message.endTime, message.type, message.status, message.room],(err,res)=>{
                if (err)console.log(err.stack);
            });
        }
        else if (message.type == "newemployee"){
            client.query("INSERT INTO public.\"User\"(\"sinNumber\", \"firstName\", \"middleName\", \"lastName\", \"birthDate\", \"pronouns\", \"houseNumber\", \"street\", \"city\", \"province\", \"postalCode\", \"gender\", \"contactEmail\", \"contactNumber\") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"
            ,[message.ssn, message.firstName, message.middleName, message.lastName, message.dateOfBirth,message.pronouns, message.houseNumber, message.street, message.city, message.province, message.postalCode, message.gender, message.email, message.phoneNumber],(err,res)=>{
                if (err){
                    console.log(err);
                }
            });
            client.query('INSERT INTO public."Employee"("sinNumber","role","branchId","salary") VALUES ($1, $2, $3, $4)',[message.ssn, message.role, message.branchID, message.salary],(err,res)=>{
                if (err){
                    console.log(err);
                }
            });
        }
        else if (message.type == "employees"){
            employees = []
            client.query({text:'SELECT * from public."Employee" e INNER JOIN public."User" u ON u."sinNumber" = e."sinNumber"',rowMode:'array'},(err,res)=>{
                if (err)console.log(err.stack);else{employees = res.rows;ws.send(JSON.stringify({type:"employees",employees:employees}));}});
            
        }
        else if(message.type=="patients"){
            patients = []
            client.query({text:"SELECT * FROM public.\"User\" u INNER JOIN public.\"Patient\" pt ON u.\"sinNumber\" = pt.\"sinNumber\"",rowMode:'array'},(err,res)=>{
                if (err)console.log(err.stack);else{patients = res.rows;ws.send(JSON.stringify({type:"patientView",patients:JSON.stringify(patients)}));}});
        }
        else if (message.type == "medicalhistory"){
            medicalHistory = []
            client.query({text:'SELECT * from public."PatientCharts" pt INNER JOIN public."User" u on u."sinNumber" = pt."patientSin"',rowMode:'array'},(err,res)=>{
                if(err)console.log(err);else{ws.send(JSON.stringify({type:"medicalhistory",medicalhistory:JSON.stringify(res.rows)}));}
            });
        }   
        else if (message.type == "addmedicalhistory"){
            client.query('INSERT INTO public."PatientCharts"("patientSin","treatmentDetails") VALUES ($1, $2)',[message.patientSin,message.description],(err,res)=>{
                if(err)console.log(err);
            });
        }
        else if (message.type == "appointmentPatient"){
            client.query({text:"SELECT * from public.\"Appointment\" apt INNER JOIN public.\"User\" u ON apt.\"dentistSin\" = u.\"sinNumber\" WHERE apt.\"patientSin\" = $1",values:[message.sin],rowMode:'array'},(err,res)=>{
                if(err)console.log(err);else{ws.send(JSON.stringify({type:"appointments",appointments:JSON.stringify(res.rows)}));}
            });
        }
        else if (message.type == "medicalHistoryPatient"){
            client.query({text:"SELECT * from public.\"PatientCharts\" pt WHERE pt.\"patientSin\" = $1",values:[message.sin],rowMode:'array'},(err,res)=>{
                if(err)console.log(err);else{ws.send(JSON.stringify({type:"medicalhistory",medicalhistory:JSON.stringify(res.rows)}));}
            });
        }
    });
});


server.listen(4000);