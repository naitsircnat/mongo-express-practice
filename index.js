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
  const { ObjectId } = require("mongodb");

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

      res.status(201).json({
        message: "Sale inserted",
        id: result.insertedId,
      });
    } catch (error) {
      console.error("Error adding sale", error);
      res.status(500).json({ Error: "Internal server error" });
    }
  });

  // Update route
  app.put("/:saleId", async (req, res) => {
    try {
      const id = req.params.saleId;

      const {
        saleDate,
        items,
        storeLocation,
        customer,
        couponUsed,
        purchaseMethod,
      } = req.body;

      if (
        !saleDate ||
        !items ||
        !storeLocation ||
        !customer ||
        !couponUsed ||
        !purchaseMethod
      ) {
        return res
          .status(400)
          .json({ Error: "Please provided required data inputs" });
      }

      const updatedSale = {
        saleDate,
        items,
        storeLocation,
        customer,
        couponUsed,
        purchaseMethod,
      };

      let result = await db
        .collection("sales")
        .updateOne({ _id: new ObjectId(id) }, { $set: updatedSale });

      if (result.matchedCount === 0) {
        return res.status(400).json({ Error: "Sale not found" });
      }

      res.json({ Status: "Sale successfully updated" });
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ Error: "Internal server error" });
    }
  });

  // Delete route
  app.delete("/sales/:saleId", async (req, res) => {
    try {
      const id = req.params.saleId;

      let result = await db
        .collection("sales")
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        res.status(400).json({ Error: "Sale not found" });
      }

      res.json({ Status: "Sale deleted." });
    } catch (error) {
      console.error({ Error: "Error deleting sale" });
      res.status(500).json({ Status: "Internal server error" });
    }
  });

  // Add mgt review route
  /*
  - Create app.post route; incl try and catch; incl. saleId and reviews
  - Create variables to store provided saleId and data for new review
  - Basic validation
  - Create object for new review
  - Perform update
  - If no matched sale, return 400 error
  - Return result that includes inserted Id
  */

  app.post("/sales/:saleId/reviews", async (req, res) => {
    try {
      const id = req.params.saleId;
      const { user, rating, comment } = req.body;

      if (!user || !rating || !comment) {
        return res.status(400).json({ Error: "Incompleted fields provided" });
      }

      const newReview = {
        review_id: new ObjectId(),
        user,
        rating: Number(rating),
        comment,
        date: new Date(),
      };

      const result = await db.collection("sales").updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $push: { reviews: newReview },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(400).json({ Error: "Recipe not found" });
      }

      res.status(201).json({
        Status: "Review added",
        review_id: newReview.review_id,
      });
    } catch (error) {
      console.error("Error", error);
      res.status(500).json({ Error: "Error adding review" });
    }
  });
}

main();

app.listen(3000, () => {
  console.log("Server started");
});
