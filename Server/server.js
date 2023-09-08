import express from "express";
import mysql from "mysql";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import multer from "multer";

const app = express();
app.use(cors(
    {
        origin: ["http://localhost:5173"],
        methods: ["POST", "GET", "PUT","PATCH","DELETE"],
        credentials: true
    }
));
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "signup"
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage
});
con.connect(function (err) {
    if (err) {
        console.log("Error in connection");
    } else {
        console.log("Connected");
    }
});

app.post('/enter', (req, res) => {
    const sql = "SELECT * FROM users WHERE email = ? AND password = ?"; 
    con.query(sql, [req.body.email, req.body.password], (err, result) => {
        if (err) return res.json({ Status: "Error" ,Error:"Error in running query"});
        if (result.length > 0) {
            const id= result[0].id;
            const token = jwt.sign({id}, "JWT-KEY", {expiresIn: '1d'});
            res.cookie('token', token);
            return res.json({ Status: "Success" });
        } else {
            return res.json({ Status: "Error", Error:"Wrong Email or Password" });
        }
    });
});

app.post('/employeelogin', (req, res) => {
  const sql = "SELECT * FROM employee Where email = ?";
  con.query(sql, [req.body.email], (err, result) => {
      if(err) return res.json({Status: "Error", Error: "Error in runnig query"});
      if(result.length > 0) {
          bcrypt.compare(req.body.password.toString(), result[0].password, (err, response)=> {
              if(err) return res.json({Error: "password error"});
              if(response) {
                  const token = jwt.sign({role: "employee", id: result[0].id}, "jwt-secret-key", {expiresIn: '1d'});
                  res.cookie('token', token);
                  return res.json({Status: "Success"})
              } else {
                  return res.json({Status: "Error", Error: "Wrong Email or Password"});
              }
              
          })
          
      } else {
          return res.json({Status: "Error", Error: "Wrong Email or Password"});
      }
  })
})

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: "Success" });
});


app.get('/getEmployee', (req, res) => {
    const sql = "SELECT * FROM employee";
    con.query(sql, (err, result) => {
        if(err) return res.json({Error: "Get employee error in sql"});
        return res.json({Status: "Success", Result: result})
    })
})

app.delete('/remove/:email', (req, res) => {
    const email = req.params.email;
    const sql = "DELETE FROM employee WHERE email = ?";
    
    con.query(sql, [email], (err, result) => {
      if (err) {
        console.error("Error deleting employee:", err);
        return res.status(500).json({ Error: "Failed to remove employee" });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ Error: "Employee not found" });
      }
  
      return res.json({ Status: "Success" });
    });
  });


  app.get('/get/:name', (req, res) => {
    const name = req.params.name;
    const sql = "SELECT * FROM employee where name = ?";
    con.query(sql, [name], (err, result) => {
        if(err) return res.json({Error: "Get employee error in sql"});
        return res.json({Status: "Success", Result: result})
    })
})

app.get('/employee/:email', (req,res) =>{
    const email = req.params.email;
    const sql = "SELECT * FROM employee where email = ?";
    con.query(sql, [email], (err, result) => {
        if(err) return res.json({Error: "Get employee error in sql"});
        return res.json({Status: "Success", Result: result})
    })
})

app.put('/updateEmployee/:email', upload.single('image'), (req, res) => {
  const email = req.params.email;
  const newDob = req.body.dob;
  const newMobile = req.body.mobile;
  const newEducation = req.body.education;
  const image = req.file.filename;

  const sql = "UPDATE employee SET dob = ?, mobile = ?, education = ?, image = ? WHERE email = ?";
  con.query(sql, [newDob, newMobile, newEducation, image, email], (err, result) => {
    if (err) return res.json({ Error: "Update employee error in SQL" });
    return res.json({ Status: "Success" });
  });
});

// app.put('/update/:email',upload.single('image'), (req, res) => {
//     const email = req.params.email;
//     const newRole = req.body.role; 
//     const newName = req.body.name; 
//     const newAddress= req.body.address; 
//     const newPassword = req.body.password; 
//     const image =    req.file.filename
  
  
//     const sql = "UPDATE employee SET role = ?, name = ?, address = ?, password = ? , image = ? WHERE email = ?";
//     con.query(sql, [newRole, newName, newAddress, newPassword,image , email], (err, result) => {
//       if (err) return res.json({ Error: "Update employee error in SQL" });
//       return res.json({ Status: "Success" });
//     });
//   });

  app.put('/updateEmployee/:email', (req, res) => {
    const email = req.params.email;
    const newDob = req.body.dob; 
    const newMobile= req.body.mobile; 
    const newEducation = req.body.education; 
    const sql = "UPDATE employee SET dob = ?, mobile = ?, education = ? WHERE email = ?";
    con.query(sql, [newDob, newMobile, newEducation, email], (err, result) => {
      if (err) return res.json({ Error: "Update employee error in SQL" });
      return res.json({ Status: "Success" });
    });
  });

  const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: "You are not authenticated" });
    } else {
      jwt.verify(token, "JWT-KEY", (err, decoded) => {
        if (err) {
          return res.status(401).json({ error: "Token is invalid or has expired" });
        }
        
        req.name = decoded.name;
        req.email = decoded.email;
        next();
      });
    }
  };
  
  app.get('/dashboard', verifyUser, (req, res) => {
    return res.json({ Status: "Success" });
  });
  
  app.get('/Empdashboard', verifyUser, (req, res) => {
    return res.json({ Status: "Success" });
  });
  

  
const saltRounds = 10;

app.post('/create', (req, res) => {
  const { name, email, password, address , role} = req.body;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      return res.json({ error: 'Error hashing password' });
    }

    const sql = "INSERT INTO employee (`name`, `email`, `password`, `address`, `role`) VALUES (?, ?, ?, ?,?)";
    const values = [name, email, hash, address , role];

    con.query(sql, values, (err, result) => {
      if (err) {
        return res.json({ error: 'Error inserting data into the database' });
      }
      return res.json({ status: 'Success' });
    });
  });
});
  

app.listen(8081, () => {
    console.log("Listening");
});
