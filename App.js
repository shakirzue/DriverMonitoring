var express = require('express');
var cors = require('cors');
var app = express();
const bodyParser = require('body-parser')
var sql = require("mssql");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const smsservice = require('./services/sms-service');
const googlemapservice = require('./services/geocoding-service');
const drivermonitoringservice = require('./services/driver-monitoring-service');
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());
// parse various different custom JSON types as JSON
app.use(bodyParser.json({ type: 'application/*+json' }));

// parse some custom thing into a Buffer
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));

// parse an HTML body into a string
app.use(bodyParser.text({ type: 'text/html' }));

app.use(cors({
    origin: process.env.CLIENT_URL,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH']
}));

app.get('/', cors(), function (req, res) {
    res.send("Welcome to Zue Driver monitoring");
});

app.post('/login', function (req, res) {
    var dbpassword;
    var dbprofileid;
    var dbuserrole;
    var isPasswordMatched = false;
    if (typeof req.body.email !== 'undefined' && typeof req.body.password !== 'undefined') {
        // connect to your database

        sql.connect(config, function (err) {
            if (err) console.log(err);
            // create Request object
            request = new sql.Request();

            // query to the database and get the records
            request.input('email', sql.NVarChar, req.body.email)
            request.query('select * from dbo.adminprofile WHERE email = @email', function (err, result) {

                if (err) console.log(err)

                // send records as a response
                console.log(result.recordset);
                if (result.recordset.length > 0) {
                    dbpassword = result.recordset[0].Password;
                    dbprofileid = result.recordset[0].Id;
                    dbuserrole = result.recordset[0].Role;
                }

                if (req.body.password == dbpassword) {
                    console.log('password has matched');
                    isPasswordMatched = true;
                }
                else {
                    console.log('password has not matched');
                    isPasswordMatched = false;
                }

                if (isPasswordMatched === true) {

                    const token = jwt.sign({ user_id: dbprofileid }, process.env.SECRET,
                        {
                            expiresIn: "2h"
                        }
                    );
                    request.input('token', sql.NVarChar, token);
                    request.input('useremail', sql.NVarChar, req.body.email);
                    request.query('Update [dbo].[adminprofile] SET Token = @token where email = @useremail', (err, result) => {
                        if (err) console.log(err);

                        res.cookie('auth', token, { expires: new Date(Date.now() + 1000 * 60), httpOnly: true });
                        res.cookie('email', req.body.email, { expires: new Date(Date.now() + 1000 * 60), httpOnly: true });
                        // res.send('Cookie is set');
                        return res.json({ success: true, message: "user logged in successfully.", auth: token, email: req.body.email, role: dbuserrole, });
                    });
                }
                else {
                    return res.status(400).json({ isAuth: false, message: "Email/Password has not provided" });
                }
            });
        });
    }
    else {
        return res.status(400).json({ isAuth: false, message: "Credential(s) have not been provided" });
    }
});

function getToken(email, token, res, cb) {
    sql.connect(config, function (err) {
        if (err) { console.log(err); return; }
        // create Request object
        request = new sql.Request();
        // query to the database and get the records
        request.input('email', sql.NVarChar, email);
        request.input('token', sql.NVarChar, token)
        request.query('select Token from dbo.adminprofile WHERE Email = @email AND Token = @token', function (err, result) {
            if (err) console.log(err);
            // send records as a response
            console.log(result.recordset);
            if (result.recordset.length > 0) {
                res.write('already logged in');
                cb(true);
            }
            else {
                res.write('please login again');
                cb(false);
            }

        });
    })

}

app.post('/CreateAction', function (req, res) {

    const disposition_id = req.body.disposition_type_id;
    const response_type_id = req.body.response_type_id;
    const assignee = req.body.assignee;
    const note = req.body.note;
    const email = req.body.email;
    const token = req.body.token;

    sql.connect(config, function (err) {
        request = new sql.Request();
        request.input('disposition_type_id', sql.Int, disposition_id)
        request.input('response_type_id', sql.Int, response_type_id)
        request.input('assignee_profile_id', sql.Int, assignee)
        request.input('note', sql.NVarChar, note)
        request.input('email', sql.NVarChar, email)
        request.input('token', sql.NVarChar, token)
        request.output('new_action_notification_id', sql.Int)
        request.execute('usp_create_action_notification', (err, result) => {
            // ... error checks
            var phonenumber = '';
            request.query('Select Phone from [dbo].[adminprofile] WHERE Id = @assignee_profile_id;', (err, result) => {
                if (err) console.log(err);
                console.log(result.recordset);
                if (result.recordset.length > 0) {
                    phonenumber = result.recordset[0].Phone;
                }
                //smsservice.sendSMS('Driver monitoring system: action has been created with note: "' + note + '"', phonenumber);
            });

            console.log(result) // count of recordsets returned by the procedure           
            console.log(result.output) // key/value collection of output values

            return res.json({ success: true, message: "action created successfully and notification sent to stakeholder.", result: 'Action created with id:' + result.output });
        })
    });
});

app.post('/CreateActionNotes', function (req, res) {
    console.log(req.body);
    const action_id = req.body.action_id;
    const note = req.body.note;
    const email = req.body.email;
    const token = req.body.token;

    sql.connect(config, function (err) {
        request = new sql.Request();
        request.input('action_id', sql.Int, action_id)
        request.input('notes', sql.NVarChar, note)
        request.input('email', sql.NVarChar, email)
        request.input('token', sql.NVarChar, token)
        request.output('new_action_notification_id', sql.Int)
        request.execute('usp_create_action_notification_notes', (err, result) => {
            // ... error checks
            console.log(result) // count of recordsets returned by the procedure           
            console.log(result.output) // key/value collection of output values           
        })
    });


});

app.post('/UpdateActionResponseType', function (req, res) {
    console.log(req);
    if (typeof req.body.action_id !== 'undefined' && typeof req.body.action_id !== 'undefined') {
        // connect to your database

        sql.connect(config, function (err) {
            if (err) console.log(err);
            // create Request object
            request = new sql.Request();

            request.input('action_id', sql.Int, req.body.action_id);
            request.input('response_type_id', sql.Int, req.body.response_type_id);
            request.query('Update [dbo].[Action_Notification] SET ResponseType_id = @response_type_id where id = @action_id', (err, result) => {
                if (err) console.log(err);

                return res.json({ success: true, message: "record has been updated successfully.", result: result });
            });


        });
    }
    else {
        return res.status(400).json({ isAuth: false, message: "Credential(s) have not been provided" });
    }
});

app.post('/UpdateActionStatus', function (req, res) {
    console.log(req.body);
    if (typeof req.body.action_id !== 'undefined' && typeof req.body.action_id !== 'undefined') {
        // connect to your database

        sql.connect(config, function (err) {
            if (err) console.log(err);
            // create Request object
            request = new sql.Request();

            request.input('action_id', sql.Int, req.body.action_id);
            request.input('status_id', sql.Int, req.body.status_id);
            request.query('Update [dbo].[Action_Notification] SET Status_id = @status_id where id = @action_id', (err, result) => {
                if (err) console.log(err);

                return res.json({ success: true, message: "record has been updated successfully.", result: result });
            });


        });
    }
    else {
        return res.status(400).json({ isAuth: false, message: "Credential(s) have not been provided" });
    }
});

app.post('/GetActionByEmail', function (req, res) {

    const email = req.body.email;
    const token = req.body.token;
    var isassignee;
    if (typeof req.body.isassignee === 'undefined' || req.body.isassignee === null) {
        isassignee = false;
    }
    else {
        isassignee = req.body.isassignee;
    }
    console.log(isassignee);
    sql.connect(config, function (err) {
        request = new sql.Request();
        request.input('email', sql.NVarChar, email)
        request.input('token', sql.NVarChar, token)
        request.input('userisassignee', sql.Bit, isassignee)
        request.execute('usp_get_action_notification_by_email', (err, result) => {
            console.log(result.recordsets[1]);
            console.log(result.recordsets[2]);
            return res.json({ success: true, message: "record found", actions: result.recordset, owner_action_note: result.recordsets[1], assignee_action_note: result.recordsets[2] });;
        })
    });
});

app.post('/GetActionNoteByEmail', function (req, res) {
    const action_id = req.body.action_id;
    const email = req.body.email;
    const token = req.body.token;
    var isassignee;
    if (typeof req.body.isassignee === 'undefined' || req.body.isassignee === null) {
        isassignee = false;
    }
    else {
        isassignee = req.body.isassignee;
    }
    console.log(isassignee);
    sql.connect(config, function (err) {
        request = new sql.Request();
        request.input('action_id', sql.Int, action_id)
        request.input('email', sql.NVarChar, email)
        request.input('token', sql.NVarChar, token)
        request.input('userisassignee', sql.Bit, isassignee)
        request.execute('usp_get_action_notification_note', (err, result) => {
            console.log(result);
            return res.json({ success: true, message: "record found", actions: result.recordset });
        })
    });
});

app.post('/GetActionCountByStatus', function (req, res) {

    const email = req.body.email;
    const token = req.body.token;
    var isassignee;
    if (typeof req.body.isassignee === 'undefined' || req.body.isassignee === null) {
        isassignee = false;
    }
    else {
        isassignee = req.body.isassignee;
    }
    console.log(isassignee);
    sql.connect(config, function (err) {
        request = new sql.Request();
        request.input('email', sql.NVarChar, email)
        request.input('token', sql.NVarChar, token)
        request.input('userisassignee', sql.Bit, isassignee)
        request.execute('usp_get_action_notification_count_by_status', (err, result) => {
            console.log(result);
            return res.json({ success: true, message: "record found", result: result.recordset });;
        })
    });
});

app.post('/GetStakeholders', function (req, res) {
    const email = req.body.email;
    const token = req.body.token;

    sql.connect(config, function (err) {
        request = new sql.Request();
        request.input('email', sql.NVarChar, email)
        request.input('token', sql.NVarChar, token)
        request.execute('usp_get_stakeholders', (err, result) => {
            return res.json({ success: true, message: "record found", result: result.recordset });;
        })
    });


});

app.get('/GetDisposition', function (req, res) {
    // connect to your database

    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        request = new sql.Request();

        // query to the database and get the records

        request.query('select * from dbo.Disposition_Type', function (err, result) {

            if (err) console.log(err)

            // send records as a response

            if (result.recordset.length > 0) {
                return res.json({ success: true, message: "user logged in successfully.", result: result.recordset });
            }
            else {
                return res.status(400).json({ isAuth: false, message: "Email/Password has not provided" });
            }
        });
    });

});

app.get('/GetResponseType', function (req, res) {
    // connect to your database

    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        request = new sql.Request();

        // query to the database and get the records

        request.query('select * from dbo.Response_Type', function (err, result) {

            if (err) console.log(err)

            // send records as a response

            if (result.recordset.length > 0) {
                return res.json({ success: true, message: "record fetched successfully.", result: result.recordset });
            }
            else {
                return res.status(400).json({ isAuth: false, message: "unable to fetch record" });
            }
        });
    });

});

app.get('/GetActionStatus', function (req, res) {
    // connect to your database

    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        request = new sql.Request();

        // query to the database and get the records

        request.query('select * from dbo.Action_Status', function (err, result) {

            if (err) console.log(err)

            // send records as a response

            if (result.recordset.length > 0) {
                return res.json({ success: true, message: "record fetched successfully.", result: result.recordset });
            }
            else {
                return res.status(400).json({ isAuth: false, message: "unable to fetch record" });
            }
        });
    });

});

app.get('/GetRole', function (req, res) {
    // connect to your database

    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        request = new sql.Request();

        // query to the database and get the records

        request.query('select * from dbo.User_Type', function (err, result) {

            if (err) console.log(err)

            // send records as a response

            if (result.recordset.length > 0) {
                console.log(result.recordset);
                return res.json({ success: true, message: "record fetched successfully.", result: result.recordset });
            }
            else {
                return res.status(400).json({ isAuth: false, message: "unable to fetch record" });
            }
        });
    });

});

app.post('/GenerateCallLogAndCoordinate', async function (req, res) {
    // connect to your database
    // console.log(req.body);
    var Date = '9/1/2021';
    const salesOrders = await drivermonitoringservice.GetDriverTripRecords(Date);
    //console.log('salesorders',salesOrders)
    const callLogdata = await drivermonitoringservice.GetDriverCallLogRecords(Date);
    //console.log('call logs',callLogdata)
    drivermonitoringservice.CompareTripDataWithLogData(salesOrders, callLogdata, Date);


    //    console.log(salesOrders);
    //    console.log(callLogdata);
    // sql.connect(config.config, function (err) {
    //     if (err) console.log(err);

    //     request = new sql.Request();

    //     request.input('Date', sql.Date, req.body.DateToSearch);
    //     request.query('SELECT * FROM [dbo].[SalesOrder_Logs_Details]', function (err, result) {

    //         if (err) console.log(err)

    //         if (result.recordset.length > 0) {

    //             salesOrders.foreach(salesorder => {
    //                 const filteredUsers = result.recordset.filter(SOlog => {
    //                     if (salesorder.ordernumber !== SOlog.SalesOrderNumber) {
    //                         StoreSalesOrder(salesorder, callLogdata);
    //                         // coordinates = googlemapservice.calculateCustomerAddressGeoCoordinates(salesorder.address);

    //                         // let numberOfCallMade = drivermonitoringservice.checkCallLogDetail(salesorder, callLogdata);
    //                         // if (numberOfCallMade.length > 0) {
    //                         //     isPhoneFoundInLog = true;
    //                         // }
    //                         // else {
    //                         //     isPhoneFoundInLog = false;
    //                         // }
    //                         // drivermonitoringservice.SaveSalesOrderLog([{
    //                         //     SalesOrderNumber: salesorder.ordernumber, Date: salesorder.TripDate,
    //                         //     IsCustomerPhoneInCallLog: isPhoneFoundInLog, Customerlatitude: coordinates.latitude, CustomerLongitude: coordinates.longitude
    //                         // }]);
    //                     }
    //                 });
    //             });

    //             return res.json({ success: true, message: "record fetched successfully.", result: result.recordset });
    //         }
    //         else {
    //             salesOrders.foreach(salesorder => {
    //                 StoreSalesOrder(salesorder, callLogdata)
    //             });
    //         }
    //     });
    // });

});

app.post('/GetCallLocationLogs', function (req, res) {
    // connect to your database

    sql.connect(config, function (err) {
        if (err) console.log(err);
        // create Request object
        request = new sql.Request();

        // query to the database and get the records

        request.query('select solog.*, ea.[Exception Type] as ExceptionType, ea.Note from dbo.SalesOrder_Logs_Details as solog inner join '+
        'dbo.DriverMonitoringExceptionActivityData ea on solog.[SalesOrderNumber] = ea.[Order #]', function (err, result) {

            if (err) console.log(err)

            // send records as a response

            if (result.recordset.length > 0) {
                console.log(result.recordset);
                return res.json({ success: true, message: "record fetched successfully.", result: result.recordset });
            }
            else {
                return res.status(400).json({ isAuth: false, message: "unable to fetch record" });
            }
        });
    });

});

app.post('/GetTripRoutes', function (req, res) {
    sql.connect(config, function (err) {
        if (err) console.log(err);        
        request = new sql.Request();

        request.query('', function (err, result) {

            if (err) console.log(err);           

            if (result.recordset.length > 0) {                
                return res.json({ success: true, message: "record fetched successfully.", result: result.recordset });
            }
            else {
                return res.status(400).json({ success: false, message: "unable to fetch record" });
            }
        });
    });

});

app.post("/iframe", (req, res) => {
    var src = 'https://app.powerbi.com/view?r=eyJrIjoiMGVmMzc0ZDItNzdiYS00NDdmLThhZjktZTY2ZmQ3NzgxOTY5IiwidCI6IjdkODViMzVjLTg3MmUtNDA1NS1hZjkyLTgwZmI3YzlmOTRiNCIsImMiOjF9';
    var title = 'Driver Monitoring Live - Trip Analysis';
    var allowfullscreen = "true"
    return res.send({ message: "Drivers status", src: src, title: title, isFullScreen: allowfullscreen });
});

app.get("/logout", (req, res) => {
    // clear the cookie
    res.clearCookie("auth");
    res.clearCookie("email");
    // redirect to login
    return res.send("logout successfully");
});




var server = app.listen(process.env.SERVER_RUN_PORT, function () {
    console.log('Server is running..');
});