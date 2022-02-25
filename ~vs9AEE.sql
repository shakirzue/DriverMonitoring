select * from 
dbo.DriverMonitoringTripEventActivityData ta inner join 
dbo.DriverMonitoringTripItineraryData ti on ta.[Order #]=ti.[Order #] 
--inner join dbo.DriverMonitoringCallLogData cl on ta.[Trip Date] = cl.[DATE]
--where ta.[Order #]= '242519'
 WHERE ta.[Type] = 'Skip Stop'
  --select * from DriverMonitoringCallLogData
 select * from SalesOrder_Logs_Details
 where salesordernumber = '987654'
 truncate table dbo.SalesOrder_Logs_Details 


 select CONVERT(VARCHAR(50), TIME) as TIME, DATE, PHONE, DESTINATION, [Employee Phone], [Employee Name] from dbo.DriverMonitoringCallLogData WHERE Date = '9/1/2021'
 select ta.[Event Time] as DateTime, ta.[Trip Date] as Date,Latitude, Longitude, Address, ta.[Order #] as OrderNumber, [Phone #] as Phone from dbo.DriverMonitoringTripEventActivityData ta inner join dbo.DriverMonitoringTripItineraryData ti on ta.[Order #]=ti.[Order #] WHERE ta.Type = 'Skip Stop' AND [Trip Date] = '9/1/2021'
