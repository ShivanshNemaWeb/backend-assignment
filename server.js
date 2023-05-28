const express = require("express");
const axios = require('axios');
const app = express();
require("dotenv").config();
const PORT = 5000;
app.use(express.json());
const ConnectDB = require("./database/connection");
const Transaction =require("./models/transactions");

//Connecting with MongoDB Database

ConnectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
    console.log("Not Connected to database");
  });

// API for inserting data into database
//eg.- http://localhost:5000/initialize
app.get('/initialize', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const seedData = response.data.map(item => ({
      ...item,
      dateOfSale: new Date(item.dateOfSale) // Convert the dateOfSale string to a Date object
    }));

    await Transaction.insertMany(seedData);

    res.send('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).send('An error occurred while initializing the database.');
  }
});

//API for Statistics 
//eg.- http://localhost:5000/statistics/:2022-07
app.get('/statistics/:month', async (req, res) => {
  try {
    const selectedMonth = req.params.month;

    const startDate = new Date(selectedMonth);
    startDate.setUTCDate(1); // Set the date to the 1st day of the month
    startDate.setUTCHours(0, 0, 0, 0); // Set the time to the beginning of the day

    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1); // Set the month to the next month

    const totalSaleAmount = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: { $gte: startDate, $lt: endDate },
          sold: true
        }
      },
      {
        $group: {
          _id: { $month: "$dateOfSale" }, // Group by the month of the dateOfSale field
          totalSaleAmount: { $sum: "$price" }
        }
      }
    ]);

    const totalSoldItems = await Transaction.countDocuments({
      dateOfSale: { $gte: startDate, $lt: endDate },
      sold: true
    });

    const totalUnsoldItems = await Transaction.countDocuments({
      dateOfSale: { $gte: startDate, $lt: endDate },
      sold: false
    });

    const statistics = {
      totalSaleAmount: totalSaleAmount.length > 0 ? totalSaleAmount[0].totalSaleAmount : 0,
      totalSoldItems,
      totalUnsoldItems
    };

    res.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).send('An error occurred while fetching statistics.');
  }
});


//API for bar chart 
// eg.- http://localhost:5000/bar-chart/:2022-07
app.get('/bar-chart/:month', async (req, res) => {
  try {
    const selectedMonth = req.params.month;

    const startDate = new Date(selectedMonth);
    startDate.setUTCDate(1); // Set the date to the 1st day of the month
    startDate.setUTCHours(0, 0, 0, 0); // Set the time to the beginning of the day

    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1); // Set the month to the next month

    const barChartData = await Transaction.aggregate([
      {
        $match: {
          dateOfSale: { $gte: startDate, $lt: endDate },
          sold: true
        }
      },
      {
        $group: {
          _id: null,
          "0-100": {
            $sum: {
              $cond: [{ $lte: ["$price", 100] }, 1, 0]
            }
          },
          "101-200": {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$price", 100] }, { $lte: ["$price", 200] }] }, 1, 0]
            }
          },
          "201-300": {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$price", 200] }, { $lte: ["$price", 300] }] }, 1, 0]
            }
          },
          "301-400": {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$price", 300] }, { $lte: ["$price", 400] }] }, 1, 0]
            }
          },
          "401-500": {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$price", 400] }, { $lte: ["$price", 500] }] }, 1, 0]
            }
          },
          "501-600": {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$price", 500] }, { $lte: ["$price", 600] }] }, 1, 0]
            }
          },
          "601-700": {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$price", 600] }, { $lte: ["$price", 700] }] }, 1, 0]
            }
          },
          "701-800": {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$price", 700] }, { $lte: ["$price", 800] }] }, 1, 0]
            }
          },
          "801-900": {
            $sum: {
              $cond: [{ $and: [{ $gt: ["$price", 800] }, { $lte: ["$price", 900] }] }, 1, 0]
            }
          },
          "901-above": {
            $sum: {
              $cond: [{ $gt: ["$price", 900] }, 1, 0]
            }
          }
        }
      }
    ]);

    const chartData = {
      "0-100": barChartData[0]["0-100"] || 0,
      "101-200": barChartData[0]["101-200"] || 0,
      "201-300": barChartData[0]["201-300"] || 0,
      "301-400": barChartData[0]["301-400"] || 0,
      "401-500": barChartData[0]["401-500"] || 0,
      "501-600": barChartData[0]["501-600"] || 0,
      "601-700": barChartData[0]["601-700"] || 0,
      "701-800": barChartData[0]["701-800"] || 0,
      "801-900": barChartData[0]["801-900"] || 0,
      "901-above": barChartData[0]["901-above"] || 0
    };
    
    res.json(chartData);
  }
  catch{
    res.json("something went wrong");
  }
})   


//API for combined data
// eg.- http://localhost:5000/combined-data?month=2022-07
app.get('/combined-data', async (req, res) => {
  try {
    // Extract the month from the query parameter
    const { month } = req.query;

    const [statisticsResponse, barChartResponse] = await Promise.all([
      axios.get(`http://localhost:5000/statistics/${month}`),
      axios.get(`http://localhost:5000/bar-chart/${month}`),
    ]);

    // Extract the data from the API responses
    const statisticsData = statisticsResponse.data;
    const barChartData = barChartResponse.data;

    // Combine the data into a single response object
    const combinedData = {
      statistics: statisticsData,
      barChart: barChartData,
    };

    res.json(combinedData);
  } catch (error) {
    console.error('Error fetching combined data:', error);
    res.status(500).send('An error occurred while fetching combined data.');
  }
});











