/****** Script for SelectTopNRows command from SSMS  ******/
SELECT *
  FROM [dbo].[DriverMonitoringTripEventActivityData]
  where  
  --[trip date] = '2021-09-03'
  [order #] = '242519'
SELECT * FROM [dbo].[DriverMonitoringTripItineraryData]
where
[order #] = '242519'

/****** Script for SelectTopNRows command from SSMS  ******/
SELECT *
  FROM [dbo].[DriverMonitoringCallLogData]
 -- where [Date] = '9/1/2021'

