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
        .limit(20)
        .toArray();
      res.json(sales);
    } catch (error) {
      console.error("Error: ", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

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
}

main();

app.listen(3000, () => {
  console.log("Server started");
});
