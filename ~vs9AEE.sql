select * from 
dbo.DriverMonitoringTripEventActivityData ta inner join 
dbo.DriverMonitoringTripItineraryData ti on ta.[Order #]=ti.[Order #] 
--inner join dbo.DriverMonitoringCallLogData cl on ta.[Trip Date] = cl.[DATE]
--where ta.[Order #]= '242519'
 WHERE ta.[Type] = 'Skip Stop'
  select * from DriverMonitoringCallLogData
 select * from SalesOrder_Logs_Details

 delete from dbo.SalesOrder_Logs_Details where id = 16
   delete from dbo.SalesOrder_Logs_Details where id = 17
   delete from dbo.SalesOrder_Logs_Details where id = 14