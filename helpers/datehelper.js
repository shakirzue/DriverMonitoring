var moment = require('moment')
function convertformattommddyyyy(inputDate) {
    var date = new Date(inputDate);
    if (!isNaN(date.getTime())) {
        return date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();
    }
}

function convertformattoyyyymmdd(inputDate) {
    var date = new Date(inputDate);   
    if (!isNaN(date.getTime())) {
        return date.getFullYear()+ '-' + (date.getMonth() + 1) + '-' + date.getDate()  ;
    }
}

function extractTimeFromDate(dateTimeValue) {
    var dateTime = dateTimeValue.toString().split(' ');
    if (dateTime.length > 0) {
        time = dateTime[1];
        return time;
    }
}

function convertTime12To24(time) {
   
    var hours = Number(time.match(/^(\d+)/)[1]);
    var minutes = Number(time.match(/:(\d+)/)[1]);
    var AMPM = time.match(/\s(.*)$/)[1];
    if (AMPM === "PM" && hours < 12) hours = hours + 12;
    if (AMPM === "AM" && hours === 12) hours = hours - 12;
    var sHours = hours.toString();
    var sMinutes = minutes.toString();
    if (hours < 10) sHours = "0" + sHours;
    if (minutes < 10) sMinutes = "0" + sMinutes;
    return (sHours + ":" + sMinutes);
}

function convertstrtimetotime(time2, time1) {
    
    t2 = new Date("01/01/1970" + " " + time2);
    t1 = new Date("01/01/1970" + " " + time1);

    var startDate = moment(t1, 'DD-MM-YYYY HH:mm:ss')
    var endDate = moment(t2, 'DD-MM-YYYY HH:mm:ss')
    var secondsDiff = endDate.diff(startDate, 'seconds')
   
    return ((secondsDiff/60)/60);
}

module.exports = {
    convertformattommddyyyy,
    extractTimeFromDate,
    convertTime12To24,
    convertstrtimetotime,
    convertformattoyyyymmdd
};