const express = require('express');
const dotenv = require('dotenv');
var sql = require("mssql");
const config = require('../config/config');
const googlemapservice = require('../services/geocoding-service');

const instance = new express();
dotenv.config();

function SaveSalesOrderLog(salesOrder) {

    // connect to your database
    console.log(salesOrder);

    sql.connect(config)
        .then((conn) => {
            //conn.input('Date', sql.Date, '2021-09-03');

            const request = conn.request();
            let result = request
                .input('Date', sql.Date, salesOrder.Date)
                .input('SalesOrderNumber', sql.NVarChar, salesOrder.SalesOrderNumber)
                .input('NumberOfCallMade', sql.Int, 0)//salesOrder.NumberOfCallMade);
                .input('IsCustomerPhoneInLog', sql.Bit, salesOrder.IsCustomerPhoneInCallLog)
                .input('CustomerAddressLatitude', sql.Float, salesOrder.Customerlatitude)
                .input('CustomerAddressLongitude', sql.Float, salesOrder.CustomerLongitude)
                .input('DifferenceInCoordinates', sql.Float, salesOrder.distance)
                .query("INSERT INTO dbo.SalesOrder_Logs_Details VALUES (@SalesOrderNumber, @Date, @NumberOfCallMade, @IsCustomerPhoneInLog, @CustomerAddressLatitude, @CustomerAddressLongitude,@DifferenceInCoordinates)")
                .then((result) => {
                    if (result.recordset.length > 0) {
                        return result.recordset;
                    }
                    else {
                        return null;
                    }
                })
                .then(() => conn.close())
        })



    // sql.connect(config.config1, function (err) {
    //     if (err) console.log(err);
    //     // create Request object
    //     request = new sql.Request();

    //     // query to the database and get the records
    //     request.input('Date', sql.Date, salesOrder.Date);
    //     request.input('SalesOrderNumber', sql.NVarChar, salesOrder.SalesOrderNumber);
    //     request.input('NumberOfCallMade', sql.Int, 0);//salesOrder.NumberOfCallMade);
    //     request.input('IsCustomerPhoneInLog', sql.Bit, salesOrder.IsCustomerPhoneInCallLog);
    //     request.input('CustomerAddressLatitude', sql.Float, salesOrder.Customerlatitude);
    //     request.input('CustomerAddressLongitude', sql.Float, salesOrder.CustomerLongitude);
    //     request.input('DifferenceInCoordinates', sql.Float, salesOrder.distance);
    //     request.query('INSERT INTO dbo.SalesOrder_Logs_Details VALUES (@SalesOrderNumber, @Date, @NumberOfCallMade, @IsCustomerPhoneInLog, @CustomerAddressLatitude, @CustomerAddressLongitude,@DifferenceInCoordinates)', function (err, result) {

    //         if (err) console.log(err)

    //         // send records as a response

    //         if (result.recordset.length > 0) {
    //             return result.recordset;
    //         }
    //         else {
    //             return null;
    //         }
    //     });
    // });

}

async function GetDriverCallLogRecords(date) {
    return new Promise(function (resolve, reject) {
        sql.connect(config)
            .then((conn) => {
                //conn.input('Date', sql.Date, '2021-09-03');

                const request = conn.request();
                let result = request
                    .input('Date', sql.Date, '2021-09-03')
                    .query("select * from dbo.DriverMonitoringCallLogData WHERE DATE= @Date")
                    .then((result) => {
                        if (result.recordset.length > 0) {
                            //console.log('call',result);
                            resolve(result.recordset);
                            //return result.recordset;
                        }
                    })
                    .then(() => conn.close())
            })
    });
    // let conn = sql.connect(config.config2, function (err) {
    //     if (err) console.log(err);

    //     request = new sql.Request();

    //     request.input('Date', sql.Date, date);
    //     request.query('select * from dbo.DriverMonitoringCallLogData', function (err, result) {
    //         if (result.recordset.length > 0) {
    //             return result.recordset;
    //         }

    //     })

    // }).then((v) => console.log(v))
    // .then((conn) => conn.close());

}

async function GetDriverTripRecords(date) {
    return new Promise(function (resolve, reject) {
        sql.connect(config)
            .then((conn) => {
                const request = conn.request();
                let result = request

                    .query("select ta.[Trip Date] as Date,Latitude, Longitude, Address, ta.[Order #] as OrderNumber, [Phone #] as Phone from dbo.DriverMonitoringTripEventActivityData ta inner join dbo.DriverMonitoringTripItineraryData ti on ta.[Order #]=ti.[Order #]")
                    .then((result) => {
                        if (result.recordset.length > 0) {
                            //console.log('trip:',result);
                            resolve(result.recordset);
                            //return result.recordset;
                        }
                    })
                    .then(() => conn.close())
            })
    });
    //    sql.connect(config.config2, function (err) {
    //         if (err) console.log(err);

    //         request = new sql.Request();

    //         request.input('Date', sql.Date, date);
    //         request.query('select * from dbo.DriverMonitoringTripEventActivityData ta inner join dbo.DriverMonitoringTripItineraryData ti on ta.[Order #]=ti.[Order #]', function (err, result) {
    //             console.log(result);
    //             console.log(date);
    //             if (result.recordset.length > 0) {
    //                 return result.recordset;
    //             }

    //         });

    //     }).then((v) => console.log(v))
    //     .then((conn) => conn.close());

}


async function CompareTripDataWithLogData(salesOrders, callLogdata, Date) {
    console.log('main method', salesOrders)

    sql.connect(config)
        .then((conn) => {
            const request = conn.request();
            let result = request
                .input('Date', sql.Date, Date)
                .query("SELECT * FROM [dbo].[SalesOrder_Logs_Details]")
                .then((result) => {
                    if (result.recordset.length > 0) {

                        salesOrders.foreach(salesorder => {
                            const filteredUsers = result.recordset.filter(SOlog => {
                                if (salesorder.ordernumber !== SOlog.SalesOrderNumber) {
                                    StoreSalesOrder(salesorder, callLogdata);

                                }
                            });
                        });

                        return res.json({ success: true, message: "record fetched successfully.", result: result.recordset });
                    }
                    else {
                        salesOrders.forEach(salesorder => {
                            StoreSalesOrder(salesorder, callLogdata)
                        });
                    }
                })
                .then(() => conn.close())
        })


    // sql.connect(config, function (err) {
    //     if (err) console.log(err);

    //     request = new sql.Request();

    //     request.input('Date', sql.Date, Date);
    //     request.query('SELECT * FROM [dbo].[SalesOrder_Logs_Details]', function (err, result) {

    //         if (err) console.log(err)

    //         if (result.recordset.length > 0) {

    //             salesOrders.foreach(salesorder => {
    //                 const filteredUsers = result.recordset.filter(SOlog => {
    //                     if (salesorder.ordernumber !== SOlog.SalesOrderNumber) {
    //                         StoreSalesOrder(salesorder, callLogdata);

    //                     }
    //                 });
    //             });

    //             return res.json({ success: true, message: "record fetched successfully.", result: result.recordset });
    //         }
    //         else {
    //             salesOrders.forEach(salesorder => {
    //                 StoreSalesOrder(salesorder, callLogdata)
    //             });
    //         }
    //     });
    // });
}


function checkCallLogDetail(salesOrder, callLogDetails) {
    var numberOfCallMade = 0;
    callLogDetails.forEach(calldetail => {
        if (calldetail.DATE === salesOrder.TripDate &&
            calldetail.PHONE.replace(/\D/g, "") === salesOrder.CustomerPhone.replace(/\D/g, "")) {
            numberOfCallMade++;
        }
    });
    return numberOfCallMade;

    // sql.connect(config, function (err) {
    //     if (err) console.log(err);
    //     // create Request object
    //     request = new sql.Request();

    //     // query to the database and get the records
    //     request.input('SONumber', sql.NVarChar, req.body.DateToSearch);
    //     request.query('select * from dbo.DriverMonitoringTripEventActivityData ta inner join dbo.DriverMonitoringTripItineraryData ti on ta.[Order #]=ti.[Order #] inner join dbo.DriverMonitoringCallLogData cl on ta.[Trip Date] = cl.[DATE] where ta.[Order #]= @SONumber', function (err, result) {

    //         if (err) console.log(err)

    //         if (result.recordset.length > 0) {

    //         }
    //         else {
    //             return null;
    //         }   
    //     });
    // });

}

async function StoreSalesOrder(salesorder, callLogdata) {
    var coordinates = await googlemapservice.calculateCustomerAddressGeoCoordinates(salesorder.Address);
    console.log(coordinates);
    var differenceInCoordinate = await googlemapservice.calculateDistanceByGeoCoordinates(salesorder.Latitude, coordinates.Latitude, salesorder.Longitude, coordinates.Longitude);
    console.log(differenceInCoordinate);
    var isPhoneFoundInLog;
    let numberOfCallMade = checkCallLogDetail(salesorder, callLogdata);
    if (numberOfCallMade.length > 0) {
        isPhoneFoundInLog = true;
    }
    else {
        isPhoneFoundInLog = false;
    }
    SaveSalesOrderLog({
        SalesOrderNumber: salesorder.OrderNumber, Date: salesorder.Date, NumberOfCallMade: numberOfCallMade.length,
        IsCustomerPhoneInCallLog: isPhoneFoundInLog, Customerlatitude: coordinates.Latitude,
        CustomerLongitude: coordinates.Longitude, distance: differenceInCoordinate
    });
}

module.exports = {
    SaveSalesOrderLog,
    checkCallLogDetail,
    GetDriverCallLogRecords,
    GetDriverTripRecords,
    CompareTripDataWithLogData
};