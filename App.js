var express = require('express');
var cors = require('cors');
var app = express();
const bodyParser = require('body-parser')
var sql = require("mssql");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
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
                        return res.json({ success: true, message: "user logged in successfully.", auth: token, email: req.body.email, role: dbuserrole,  });
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
        request.input('assignee', sql.Int, assignee)
        request.input('note', sql.NVarChar, note)
        request.input('email', sql.NVarChar, email)
        request.input('token', sql.NVarChar, token)      
        request.output('new_action_notification_id', sql.Int)
        request.execute('usp_create_action_notification', (err, result) => {
            // ... error checks
            console.log(result) // count of recordsets returned by the procedure           
            console.log(result.output) // key/value collection of output values           
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
            console.log(result);
            return res.json({ success: true, message: "record found", actions: result.recordset });;
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

var server = app.listen(5000, function () {
    console.log('Server is running..');
});