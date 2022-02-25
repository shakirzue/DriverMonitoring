const express = require('express');
const dotenv = require('dotenv');
var sql = require("mssql");
const config = require('../config/config');
const googlemapservice = require('../services/geocoding-service');
const dateformatehelper = require('../helpers/datehelper');
const stringhelper = require('../helpers/numberhelper');

const instance = new express();
dotenv.config();

function SaveSalesOrderLog(salesOrder) {
   // console.log('date before saving', dateformatehelper.convertformattoyyyymmdd(salesOrder.Date));
    sql.connect(config)
        .then((conn) => {
            const request = conn.request();
            let result = request

                .input('SalesOrderNumber', sql.NVarChar, salesOrder.SalesOrderNumber)
                .input('Date', sql.NVarChar, dateformatehelper.convertformattoyyyymmdd(salesOrder.Date))
                .input('NumberOfCallMade', sql.Int, salesOrder.NumberOfCallMade)
                .input('IsCustomerPhoneInLog', sql.Bit, salesOrder.IsCustomerPhoneInCallLog)
                .input('CustomerAddressLatitude', sql.Float, salesOrder.CustomerLatitude)
                .input('CustomerAddressLongitude', sql.Float, salesOrder.CustomerLongitude)
                .input('DifferenceInCoordinates', sql.Float, salesOrder.distance)
                .input('DifferenceInLastCallAndSkipTimes', sql.Float, salesOrder.TimeDifference)
                .query("INSERT INTO dbo.SalesOrder_Logs_Details VALUES (@SalesOrderNumber, @Date, @NumberOfCallMade, @IsCustomerPhoneInLog, @CustomerAddressLatitude, @CustomerAddressLongitude,@DifferenceInCoordinates, @DifferenceInLastCallAndSkipTimes)")
                .then((result) => {
                    // if (result.recordset.length > 0) {
                    //     return result.recordset;
                    // }
                    // else {
                    //     return null;
                    // }
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
                const request = conn.request();
                let result = request
                    .input('Date', sql.NVarChar, date)
                    .query("select CONVERT(VARCHAR(50), TIME) as TIME, DATE, PHONE, DESTINATION, [Employee Phone], [Employee Name] from dbo.DriverMonitoringCallLogData WHERE Date = @Date")
                    .then((result) => {
                        if (result.recordset.length > 0) {
                            resolve(result.recordset);
                        }
                    })
                    .then(() => conn.close())
            })
    });
}

async function GetDriverTripRecords(date) {

    return new Promise(function (resolve, reject) {
        sql.connect(config)
            .then((conn) => {
                const request = conn.request();
                var query = "select ta.[Event Time] as DateTime, ta.[Trip Date] as Date,Latitude, Longitude, " +
                    "Address, ta.[Order #] as OrderNumber, [Phone #] as Phone " +
                    "from dbo.DriverMonitoringTripEventActivityData ta inner join dbo.DriverMonitoringTripItineraryData ti " +
                    "on ta.[Order #]=ti.[Order #] WHERE ta.Type = 'Skip Stop' AND [Trip Date] = @Date"
                let result = request
                    .input('Date', sql.NVarChar, date)
                    .query(query)
                    .then((result) => {
                        if (result.recordset.length > 0) {
                            resolve(result.recordset);
                        }
                    })
                    .then(() => conn.close())
            })
    });
}

async function CompareTripDataWithLogData(salesOrders, callLogdata, Date) {
    console.log('main method', salesOrders);
console.log(dateformatehelper.convertformattoyyyymmdd( Date));
    sql.connect(config)
        .then((conn) => {
            const request = conn.request();
            let result = request
                .input('Date', sql.NVarChar, dateformatehelper.convertformattoyyyymmdd( Date))
                .query("SELECT * FROM [dbo].[SalesOrder_Logs_Details] WHERE Date = @Date")
                .then((result) => {
                    if (result.recordset.length > 0) {
                        salesOrders.forEach(salesorder => {
                            const filteredUsers = result.recordset.filter(SOlog => {
                               
                                if (salesorder.OrderNumber !== SOlog.SalesOrderNumber && salesorder.Date.toString() !== SOlog.Date.toString()) {
                                    //if (salesorder.OrderNumber !== SOlog.SalesOrderNumber) {
                                        console.log('sales log',dateformatehelper.convertformattoyyyymmdd(salesorder.Date).toString()); 
                                        console.log('call log',dateformatehelper.convertformattoyyyymmdd(SOlog.Date)); 
                                        console.log('sales number',salesorder.OrderNumber); 
                                        console.log('sales log number',SOlog.SalesOrderNumber); 
                                    StoreSalesOrder(salesorder, callLogdata);
                                }
                            });
                        });

                        return result.recordset;
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
    var callAndStopTimesDiff;
    callLogDetails.forEach(calldetail => {
        let salesorderdate = dateformatehelper.convertformattommddyyyy(salesOrder.Date);
        let calllogdate = dateformatehelper.convertformattommddyyyy(calldetail.DATE);

        let salesordertime = dateformatehelper.extractTimeFromDate(salesOrder.DateTime);

        let calledPhone = stringhelper.getnumberfromstring(calldetail.PHONE);
        let customerPhone = stringhelper.getnumberfromstring(salesOrder.Phone);

        if (calllogdate === salesorderdate &&
            calledPhone === customerPhone) {
            callAndStopTimesDiff = dateformatehelper.convertstrtimetotime(salesordertime, calldetail.TIME);
            numberOfCallMade++;
        }
    });
    return { numberOfCallMade, callAndStopTimesDiff };

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

    var differenceInCoordinate = await googlemapservice.calculateDistanceByGeoCoordinates(salesorder.Latitude, coordinates.Latitude, salesorder.Longitude, coordinates.Longitude);

    var isPhoneFoundInLog;
    let { numberOfCallMade, callAndStopTimesDiff } = checkCallLogDetail(salesorder, callLogdata);
    if (numberOfCallMade > 0) {
        isPhoneFoundInLog = true;
    }
    else {
        isPhoneFoundInLog = false;
    }

    SaveSalesOrderLog({
        SalesOrderNumber: salesorder.OrderNumber, Date: salesorder.Date, NumberOfCallMade: numberOfCallMade,
        IsCustomerPhoneInCallLog: isPhoneFoundInLog, CustomerLatitude: coordinates.Latitude,
        CustomerLongitude: coordinates.Longitude, distance: differenceInCoordinate, TimeDifference: callAndStopTimesDiff
    });
}

module.exports = {
    SaveSalesOrderLog,
    checkCallLogDetail,
    GetDriverCallLogRecords,
    GetDriverTripRecords,
    CompareTripDataWithLogData
};