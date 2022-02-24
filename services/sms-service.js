const dotenv = require('dotenv')
dotenv.config();
var account_sid= process.env.TWILIO_ACCOUNT_SID
var auth_token = process.env.TWILIO_AUTH_TOKEN
var twilio_phone_number = process.env.TWILIO_PHONE_NUMBER

const client = require('twilio')(account_sid, auth_token);
const sendSMS = (message, phone) =>{
console.log(phone);
console.log(message);
console.log(twilio_phone_number);
    client.messages.create({
        to: phone,
        from: twilio_phone_number,
        body: message
    }).then((message)=>console.log(message))

}
module.exports = {
    sendSMS
};