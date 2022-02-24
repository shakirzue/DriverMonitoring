const express = require('express');
const dotenv = require('dotenv');

var sql = require("mssql");
const config = require('../config/config');
dotenv.config();
const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GEOCODING_KEY,
    Promise: Promise
});

async function calculateCustomerAddressGeoCoordinates(address) {
    return new Promise(function (resolve, reject) {
    googleMapsClient.geocode({
        address: address
      }, function(err, response) {
        if (!err) {
            response.json.results.forEach(element => {
                console.log(Object.keys(element));
                Object.keys(element).forEach(function (key) {
                    if(key === 'geometry')
                    {
                       
                        resolve({Latitude: element[key].location.lat, Longitude:element[key].location.lng });
                        //return [{ Latitude: element[key].location.lat, Longitude:element[key].location.lng }];
                    }
                });

            });
            //console.log(response.json.results);
          //console.log(response.json.results.geometry.location);
        }
      });
    // googleMapsClient.geocode({ address: address })
    //    // .asPromise()
    //     .then((response) => {
    //         console.log(response.json.results);
    //         return response.json.results;
    //     })
    //     .catch((err) => {
    //         console.log(err);
    //     });
    });
}

async function calculateDistanceByGeoCoordinates(lat1, lat2, long1, long2){
  
    return new Promise(function (resolve, reject) {
        var R = 3958.8; // Radius of the Earth in miles
        var rlat1 = lat1 * (Math.PI/180); // Convert degrees to radians
        var rlat2 = lat2 * (Math.PI/180); // Convert degrees to radians
        var difflat = rlat2-rlat1; // Radian difference (latitudes)
        var difflon = (long2-long1) * (Math.PI/180); // Radian difference (longitudes)
  
        var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat/2)*Math.sin(difflat/2)+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(difflon/2)*Math.sin(difflon/2)));
        resolve( d);
    });

}

module.exports = {
    calculateCustomerAddressGeoCoordinates,
    calculateDistanceByGeoCoordinates
};