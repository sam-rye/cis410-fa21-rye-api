const express = require("express");
const bcrypt = require("bcryptjs");

const db = require("./dbConnectExec.js");

const app = express();
app.use(express.json());

app.listen(5000, () => {
  console.log("app is running on port 5000");
});

app.get("/hi", (req, res) => {
  res.send("hello world");
});

app.get("/", (req, res) => {
  res.send("API is running");
});

//app.post()
//app.put()

app.post("/attendee", async (req, res) => {
  //res.send("/contacts called");

  //console.log("request body", req.body);

  let nameFirst = req.body.nameFirst;
  let nameLast = req.body.nameLast;
  let email = req.body.email;
  let phone = req.body.phone;
  let billingAddress = req.body.billingAddress;
  let password = req.body.password;

  if (
    !nameFirst ||
    !nameLast ||
    !email ||
    !phone ||
    !billingAddress ||
    !password
  ) {
    return res.status(400).send("Bad request");
  }

  nameFirst = nameFirst.replace("'", "''");
  nameLast = nameLast.replace("'", "''");

  let emailCheckQuery = `SELECT email
  FROM Attendee
  WHERE email = '${email}'`;

  let existingUser = await db.executeQuery(emailCheckQuery);

  //console.log("existing user", existingUser);

  if (existingUser[0]) {
    return res.status(409).send("Duplicate email");
  }

  let hashedPassword = bcrypt.hashSync(password);

  let insertQuery = `INSERT INTO Attendee(NameFirst, NameLast, Email, Phone, BillingAddress, Password)
  VALUES('${nameFirst}','${nameLast}','${email}','${phone}','${billingAddress}','${hashedPassword}')`;

  db.executeQuery(insertQuery)
    .then(() => {
      res.status(201).send();
    })
    .catch((err) => {
      console.log("error in POST / attendee", err);
      res.status(500).send();
    });
});

app.get("/concert", (req, res) => {
  //get data from the database
  db.executeQuery(
    `SELECT * 
    FROM Concert
    LEFT JOIN Venue
    ON Venue.VenuePK = Concert.VenueFK`
  )
    .then((theResults) => {
      res.status(200).send(theResults);
    })
    .catch((myError) => {
      console.log(myError);
      res.status(500).send();
    });
});

app.get("/concert/:pk", (req, res) => {
  let pk = req.params.pk;
  //console.log(pk);
  let myQuery = `SELECT * 
  FROM Concert
  LEFT JOIN Venue
  ON Venue.VenuePK = Concert.VenueFK
  WHERE ConcertPK = ${pk}`;

  db.executeQuery(myQuery)
    .then((result) => {
      //console.log("result", result);
      if (result[0]) {
        res.send(result[0]);
      } else {
        res.status(404).send(`bad request`);
      }
    })
    .catch((err) => {
      console.log("Error in /concert/:pk", err);
      res.status(500).send();
    });
});
