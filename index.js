const express = require("express");
const cors = require("cors");

let app = express();
app.use(express.json());
app.use(cors());

require("dotenv").config();

const mongoClient = require("mongodb").MongoClient;
const mongoURI = process.env.MONGO_URI;

async function connect(mongoURI, dbName) {
  let client = await mongoClient.connect(mongoURI);
  let db = client.db(dbName);
  return db;
}

async function main() {
  let db = await connect(mongoURI, "sample_supplies");

  // Get all sales
  app.get("/sales", async (req, res) => {
    try {
      const sales = await db
        .collection("sales")
        .find()
        .project({
          _id: 0,
          storeLocation: 1,
          items: 1,
          "customer.email": 1,
        })
        .limit(10)
        .toArray();
      res.json(sales);
    } catch (error) {
      console.error("Error: ", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get a specific sale

  const { ObjectId } = require("mongodb");

  app.get("/sale/:id", async (req, res) => {
    try {
      const saleId = req.params.id;

      const sale = await db.collection("sales").findOne(
        {
          _id: new ObjectId(saleId),
        },
        {
          projection: { _id: 0, items: 0 },
        }
      );

      if (!sale) {
        // return res.json({ Status: "Sale not found" });
        return res.status(400).json({ Error: "Sale not found" });
      }

      res.json(sale);
    } catch (error) {
      console.error("Error: ", error);
      res.status(500).json({ Error: "Internal server error" });
    }
  });

  // Search engine
  app.get("/search", async (req, res) => {
    try {
      const { purchaseMethod, item, storeLocation } = req.query;
      // const { purchaseMethod, storeLocation } = req.query;

      let query = {};

      if (purchaseMethod) {
        query["purchaseMethod"] = { $regex: purchaseMethod, $options: "i" };
      }

      if (item) {
        query["items.name"] = { $regex: item, $options: "i" };
      }

      if (storeLocation) {
        query["storeLocation"] = { $regex: storeLocation, $options: "i" };
      }

      let sales = await db
        .collection("sales")
        .find(query)
        .project({ items: 1, storeLocation: 1, purchaseMethod: 1 })
        .limit(10)
        .toArray();

      res.json(sales);
    } catch (error) {
      console.error("Error searching sales", error);
      res.status(500).json({ Error: "Internal Server Error" });
    }
  });

  // Post route
  /*
  - Get ObjectID object from mongodb
  - Create app.post with try and catch 
  - Create variables to store respective data to be inserted
  - Perform validation to check that all required data are provided
  - Insert data into collection
  - Create response that contains message and id of inserted object
  */

  app.post("/new", async (req, res) => {
    try {
      const { items, storeLocation, customer, couponUsed, purchaseMethod } =
        req.body;

      if (
        !items ||
        !storeLocation ||
        !customer ||
        !couponUsed ||
        !purchaseMethod
      ) {
        return res
          .status(400)
          .json({ Error: "Please provide all required data" });
      }

      const newSale = {
        saleDate: new Date(),
        items,
        storeLocation,
        customer,
        couponUsed,
        purchaseMethod,
      };

      const result = await db.collection("sales").insertOne(newSale);

      res.json({
        message: "Sale inserted",
        id: result.insertedId,
      });
    } catch (error) {
      console.error("Error adding sale", error);
      res.status(500).json({ Error: "Internal server error" });
    }
  });
}

main();

app.listen(3000, () => {
  console.log("Server started");
});
