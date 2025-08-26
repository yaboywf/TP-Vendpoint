const express = require('express');
const app = express();
const helmet = require("helmet")
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fs = require('fs');
const db = require('./database');
const multer = require('multer');
const upload = multer({ dest: '/static/item_images' });
const output_folder = path.join(__dirname, '/static/item_images');

app.use(express.static('static'));
app.use(express.json());
app.use(helmet());
app.use(
    helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'nonce-vendpoint'", "https://unpkg.com/leaflet/dist/leaflet.js", "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.0/socket.io.js"],
            "style-src": ["'self'", "https://unpkg.com/leaflet/dist/leaflet.css", "https://site-assets.fontawesome.com/releases/v6.6.0/css/all.css"],
            "img-src": ["'self'", "https://a.tile.openstreetmap.org", "https://b.tile.openstreetmap.org", "https://c.tile.openstreetmap.org", "data:", "https://sg.fnlife.com/"],
            "connect-src": ["'self'", "https://overpass-api.de/api/interpreter"],
            "frame-src": ["'none'"],
        },
    })
);

app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(helmet.xssFilter());
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
app.use(helmet.noSniff());
app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }));


function find_items(callback) {
    const sql = "SELECT * FROM email WHERE id = 1 OR id = 10 OR id = 2;";
    const sql1 = 'SELECT item_name, item_quantity FROM item WHERE item_quantity <= ?';

    db.query(sql, (err, result) => {
        if (err) {
            console.error(`Error during execution - Querying for email enabled setting: ${err}`);
            return callback(err, null, null);
        }
        if (result.length === 0 || result[0].email_value === "0") {
            console.error("Email setting disabled or not found");
            return callback(null, null, []);
        }

        const quantity_threshold = result[2].email_value;
        const email_address = result[1].email_value;

        db.query(sql1, [parseInt(quantity_threshold)], (err1, result1) => {
            if (err1) {
                console.error(`Error during execution - Querying for items: ${err1}`);
                return callback(err1, quantity_threshold, email_address, null);
            }
            if (result1.length === 0) return callback(null, quantity_threshold, email_address, []);
            callback(null, quantity_threshold, email_address, result1);
        });
    });
}

function format_email_content(items, quantity_threshold) {
    let email_content = `
        <img src="https://i.ibb.co/Zz0R4sQ/logo.png" alt="Logo" style="width: 150px;" />
        <p>Dear Administrator,</p>
        <p>The following vending machine items are running low, having reached the quantity threshold of ${quantity_threshold}:</p>
    `;

    if (items.length === 0) {
        email_content += `<p>No items are running low</p>`;
    } else {
        email_content += `
            <table style="border: 1px solid black; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="width: 200px; text-align: left; border: 1px solid black; padding: 3px 5px;">Item</th>
                    <th style="border: 1px solid black; padding: 3px 5px;">Quantity</th>
                </tr>
            </thead>
            <tbody>
        `
        items.forEach(item => {
            email_content += `
                <tr>
                    <td style="border: 1px solid black; padding: 3px 5px;">${item.item_name}</td>
                    <td style="text-align: center; border: 1px solid black; padding: 3px 5px;">${item.item_quantity}</td>
                </tr>
            `;
        });
        email_content += `
            </tbody>
            </table>
        `;
    }

    email_content += `
        <p>Kindly restock these items to ensure that the vending machines are well-stocked.</p>
        <p>Yours Sincerely,</p>
        <p>VendPoint</p>
    `;

    return email_content;
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tpvendpoint@gmail.com',
        pass: 'pmia qesg yzrz axsx',
    },
    tls: {
        rejectUnauthorized: false,
    },
});

function check_day() {
    const days_of_week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const day_index = today.getDay();
    const day = days_of_week[day_index];

    const sql = "SELECT email_value FROM email WHERE email_setting = ?;";

    db.query(sql, [day], (err, result) => {
        if (err) {
            console.error(`Error during execution - Querying for email day setting: ${err}`);
            return;
        }

        if (result.length === 0) {
            console.error("Email setting not found");
            return;
        }

        if (result[0].email_value === "1") {
            send_email();
            return;
        }
    });
}

cron.schedule('30 8 * * *', () => {
    check_day();
}, {
    scheduled: true,
    timezone: "Asia/Singapore"
});

function send_email() {
    find_items((err, quantity_threshold, email_address, items) => {
        if (err) {
            console.error("Error fetching items:", err);
            return;
        }

        const email_content = format_email_content(items, quantity_threshold);

        const mail_options = {
            from: 'tpvendpoint@gmail.com',
            to: email_address,
            subject: 'VendPoint Quantity Notification',
            html: email_content,
        };

        transporter.sendMail(mail_options, (error) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log("Email sent successfully");
            }
        });
    });
}

// route to redirect to the main page
app.route('/').get((req, res) => {
    res.redirect("/vm");
});

// route to redirect to the main page
app.route('/vm').get((req, res) => {
    res.sendFile(__dirname + '/templates/vm.html');
});

// route to redirect to the notifications page
app.route('/notifications').get((req, res) => {
    res.sendFile(__dirname + '/templates/email.html');
});

// route to redirect to the items page
app.route('/items').get((req, res) => {
    res.sendFile(__dirname + '/templates/items.html');
});

// route to redirect to the vending machine details page
app.route('/vm/details/:vm_id').get((req, res) => {
    res.sendFile(__dirname + '/templates/vm_details.html');
})

// get the vending machine details within a building
app.get("/get_building_details", (req, res) => {
    const building_id = req.query.id;

    if (!building_id) {
        res.status(400).json({ error: "Missing building Vending Machine ID" });
        return;
    }

    const sql1 = "SELECT * FROM vending_machine vm INNER JOIN location ON vm.location_id = location.location_id WHERE vm.location_id = ?;";
    const sql2 = "SELECT * FROM vending_payment vp INNER JOIN payment_method ON vp.payment_id = payment_method.payment_id WHERE vending_id = ?;";
    const sql3 = "SELECT * FROM status INNER JOIN vending_machine ON status.status_id = vending_machine.status_id WHERE vending_machine.location_id = ?;";

    db.query(sql1, [building_id], (err, result) => {
        if (err) return res.status(500).json({ error: `Error executing query: ${err}` });
        if (result.length === 0) return res.status(404).json({ error: "Error executing query at /get_building_details - Querying for Vending Machine: Vending Machine not found" });

        db.query(sql2, [building_id], (err1, result1) => {
            if (err1) return res.status(500).json({ error: `Error executing query at /get_building_details - Querying for Vending Machine Payment Method(s): ${err1}` });

            db.query(sql3, [building_id], (err2, result2) => {
                if (err2) return res.status(500).json({ error: `Error executing query at /get_building_details - Querying for Vending Machine Status: ${err2}` });
    
                res.json({
                    vending_machine: result[0],
                    payment: result1,
                    status: result2[0]
                });
            });
        });
    })
})

// get all vending machines
app.get("/get_all_machines", (req, res) => {
    const sql1 = "SELECT * FROM vending_machine vm INNER JOIN location ON vm.location_id = location.location_id;";
    const sql2 = "SELECT * FROM vending_payment vp INNER JOIN payment_method ON vp.payment_id = payment_method.payment_id;";
    const sql3 = "SELECT * FROM status INNER JOIN vending_machine ON status.status_id = vending_machine.status_id;";
    
    db.query(sql1, (err, result) => {
        if (err) return res.status(500).json(`Error executing query at /get_all_machines - Querying for Vending Machines: ${err}`);
        if (result.length === 0) return res.status(404).json({ error: "Error executing query at /get_all_machines - Querying for Vending Machine: Vending Machine not found" });

        db.query(sql2, (err1, result1) => {
            if (err1) return res.status(500).json({ error: `Error executing query at /get_all_machines - Querying for Vending Machine Payment Method(s): ${err1}` });

            db.query(sql3, (err2, result2) => {
                if (err2) return res.status(500).json({ error: `Error executing query at /get_all_machines - Querying for Vending Machine Status: ${err2}` });
    
                res.json({
                    vending_machine: result,
                    payment: result1,
                    status: result2
                });
            });
        });
    })
})

// get the vending machine details
app.get("/get_machine_details", (req, res) => {
    const vm_id = req.query.vm_id;

    if (!vm_id) res.status(400).json({ error: "Error during execution at /get_machine_details - Vending Machine ID is undefined" });

    const sql1 = "SELECT * FROM vending_machine vm INNER JOIN location ON vm.location_id = location.location_id WHERE vending_machine_id = ?;";
    const sql2 = "SELECT * FROM vending_payment vp INNER JOIN payment_method pm ON vp.payment_id = pm.payment_id WHERE vp.vending_id = ?;";
    const sql3 = "SELECT * FROM vending_item vi INNER JOIN item ON vi.item_id = item.item_id WHERE vi.vending_machine_id = ?;";

    db.query(sql1, [vm_id], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /get_machine_details - Querying for Vending Machine General Details: ${err}` });
        if (result.length === 0) return res.status(404).json({ error: "Error during execution at /get_machine_details - Querying for Vending Machine General Details: Vending Machine ID cannot be found" });

        db.query(sql2, [vm_id], (err1, result1) => {
            if (err) return res.status(500).json({ error: `Error during execution at /get_machine_details - Querying for Vending Machine Payment Method(s): ${err1}` });
        
            db.query(sql3, [vm_id], (err2, result2) => {
                if (err) return res.status(500).json({ error: `Error during execution at /get_machine_details - Querying for Vending Machine Items: ${err2}` });
                
                res.json({
                    general: result[0],
                    payment: result1,
                    items: result2
                })
            })
        })
    })
})

// get all items in the database
app.get("/get_all_items", (req, res) => {
    const sql = "SELECT * FROM item;";

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /get_all_items - Querying for Vending Machine Items: ${err}` });
        
        res.json({ items: result })
    })
})

// add an item to the database
app.post("/add_item", upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file data uploaded' });
    if (!req.body) return res.status(400).json({ error: 'No body data uploaded' });

    const sql = "INSERT INTO item VALUES (0, ?, ?, ?, ?, ?);";
    const name = req.body.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const cost = parseFloat(req.body.cost).toFixed(2);

    if (isNaN(cost) || cost <= 0) return res.status(400).json({ error: "Error during execution at /add_item - Cost is invalid" });

    const availability = req.body.available.toLowerCase() === "available" ? 1 : 0;

    db.query(sql, [name, cost, name, availability, req.body.quantity], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /add_item - Querying for adding an item: ${err}` });
        
        const item_id = result.insertId;
        const output_path = path.join(output_folder, name + ".webp");

        try {
            fs.renameSync(req.file.path, output_path);
        } catch(error) {
            return res.status(500).json({ error: `Error during execution at /add_item - File upload error: ${error}`});
        }

        res.json({ added: true, availability: availability, name: name, cost: cost, quantity: req.body.quantity, id: item_id });
    })
})

// delete an item from the database
app.delete("/delete_item", (req, res) => {
    const item_id = req.query.item_id;

    if (!item_id) res.status(400).json({ error: "Error during execution at /delete_item - Item ID is undefined" });

    const sql1 = "SELECT item_image FROM item WHERE item_id = ?;";
    const sql2 = "DELETE FROM item WHERE item_id = ?;";

    db.query(sql1, [item_id], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /delete_item - Querying for deleting item's image name: ${err}` });

        const image_name = result[0]["item_image"];
        const image_path = path.join(__dirname, `/static/item_images/${image_name}.webp`);

        db.query(sql2, [item_id], (err1, result1) => {
            if (err1) return res.status(500).json({ error: `Error during execution at /delete_item - Querying for deleting item: ${err1}` });

            fs.unlink(image_path, (err2) => {
                if (err) return res.status(500).json({ error: `Error during execution at /delete_item - Deleting item's image: ${err2}`} );
            });

            res.json({ deleted: true });
        })
    })
})

// delete an item from a vending machine
app.delete("/delete_vm_item", (req, res) => {
    const vm_item_id = req.query.vm_item_id;
    const vm_id = req.query.vm_id;
    
    if (!vm_item_id) res.status(400).json({ error: "Error during execution at /delete_vm_item - Item ID is undefined" });
    
    const sql = "DELETE FROM vending_item WHERE vending_item_id = ? AND vending_machine_id = ?;";

    db.query(sql, [vm_item_id, vm_id], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /delete_vm_item - Querying for deleting item: ${err}` });
        if (result.affectedRows === 0) return res.status(400).json({ error: `Error during execution at /delete_vm_item - Item ID ${vm_item_id} is invalid; No items were deleted`} );
        
        res.json({ deleted: true });
    })
})

// add items to a vending machine
app.post("/add_vm_items", async (req, res) => {
    const vm_id = req.body.vm_id;
    const items = req.body.items;

    if (!vm_id) return res.status(400).json({ error: "Error during execution at /add_vm_item - Vending Machine ID is undefined" });
    if (!items) return res.status(400).json({ error: "Error during execution at /add_vm_item - Item ID is undefined" });

    const sql1 = "INSERT INTO vending_item VALUES (0, ?, ?);";
    const sql2 = "SELECT * FROM item WHERE item_id = ?;";

    if (typeof items === "string") return res.status(400).json({ error: "Error during execution at /add_vm_item - Format is invalid. Should be an array." });

    const promises = items.map((item) => {
        return new Promise((resolve, reject) => {
            db.query(sql1, [vm_id, item], (err1) => {
                if (err1) return reject({ error: `Error during execution at /add_vm_item - Querying for inserting item into vending machine: ${err1}` });
                
                db.query(sql2, [item], (err2, result2) => {
                    if (err2) return reject({ error: `Error during execution at /add_vm_item - Querying for getting item details: ${err2}` });
                    resolve(result2[0]);
                });
            });
        });
    });

    const details = await Promise.all(promises);
    res.json({ added: true, details: details });
})

// update a payment method of a vending machine
app.put("/update_vm_payment", (req, res) => {
    const vm_id = req.query.vm_id;
    const payment_name = req.query.payment_name;
    const payment_value = req.query.payment_value;

    if (!vm_id) return res.status(400).json({ error: "Error during execution at /update_vm_payment - Vending Machine ID is undefined" });
    if (!payment_name) return res.status(400).json({ error: "Error during execution at /update_vm_payment - Payment ID is undefined" });
    if (!payment_value) return res.status(400).json({ error: "Error during execution at /update_vm_payment - Payment Value is undefined" });

    const sql = "SELECT payment_id FROM payment_method WHERE payment_name = ?;";

    db.query(sql, [payment_name], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /update_vm_payment - Querying for Payment ID: ${err}` });
        if (result.length === 0) return res.status(400).json({ error: `Error during execution at /update_vm_payment - Payment Name ${payment_value} is invalid` });

        const payment_id = result[0].payment_id;
        let sql1 = payment_value === "true" ? "INSERT INTO vending_payment VALUES (0, ?, ?);" : "DELETE FROM vending_payment WHERE vending_id = ? AND payment_id = ?;";

        db.query(sql1, [vm_id, payment_id], (err1, result1) => {
            if (err1) return res.status(500).json({ error: `Error during execution at /update_vm_payment - Querying for Payment Method: ${err1}` });
            if (result1.affectedRows === 0) return res.status(400).json({ error: `Error during execution at /update_vm_payment - Payment Method ${payment_value} is invalid. No changes made.` });

            res.json({ updated: true });
        })
    })
})

// update the general details of a vending machine
app.put("/update_vm_general", (req, res) => {
    const { vm_id, school, vendor_name, block, level, status_id } = req.query;

    if (!vm_id || !school || !vendor_name || !block || !level || !status_id) return res.status(400).json({ error: "Error during execution at /update_vm_general - Missing required parameters." });

    const sql = "UPDATE vending_machine vm JOIN location ON vm.location_id = location.location_id SET school = ?, vendor_name = ?, block = ?, floor = ?, status_id = ? WHERE vending_machine_id = ?;";

    db.query(sql, [school, vendor_name, block, level, status_id, vm_id], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /update_vm_general - Querying for Vending Machine: ${err}` });
        if (result.affectedRows === 0) return res.status(400).json({ error: `Error during execution at /update_vm_general - Vending Machine ID ${vm_id} is invalid` });

        res.json({ updated: true });
    })
})

// update the image of an item
app.put("/update_item_image", upload.single('image'), (req, res) => {
    const { filename, filetype } = req.query;

    if (!filename || !filetype) return res.status(400).json({ error: 'Filename and filetype query parameters are required' });
    if (!filetype.startsWith('image/')) return res.status(400).json({ error: 'Invalid filetype. Only image files are allowed.' });

    const filePath = path.join(output_folder, `${filename}.webp`);

    fs.rename(req.file.path, filePath, (err) => {
        if (err) return res.status(500).json({ error: 'Error saving file' });

        res.json({ updated: true });
    });
})

// update an item of a vending machine
app.put("/update_item", (req, res) => {
    const { item_id, ...other_things_to_update } = req.query;

    if (!item_id) return res.status(400).json({ error: "Error during execution at /update_item - Item ID is undefined" });

    Object.entries(other_things_to_update).forEach(([key, value]) => {
        if (key.toLowerCase() === "cost") {
            if (isNaN(value) || value <= 0) return res.status(400).json({ error: "Error during execution at /update_item - Cost is invalid" });
        } else if (key.toLowerCase() === "quantity") {
            if (isNaN(value) || value < 0) return res.status(400).json({ error: "Error during execution at /update_item - Quantity is invalid" });
        }
    });
    
    let key = Object.keys(other_things_to_update)[0] !== "availability" ? "item_" + Object.keys(other_things_to_update)[0] : "availability";
    let value = Object.values(other_things_to_update)[0];
    const allowed_keys = ['item_name', 'item_cost', 'item_quantity', 'availability'];

    if (!allowed_keys.includes(key)) return res.status(400).json({ error: "Error during execution at /update_item - Invalid key. Allowed keys: item_name, item_cost, item_quantity, availability" });

    const sql = `UPDATE item SET ${key} = ? WHERE item_id = ?;`;

    db.query(sql, [value, item_id], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /update_item - Querying for Item: ${err}` });
        if (result.affectedRows === 0) return res.status(400).json({ error: `Error during execution at /update_item - Item ID ${item_id} is invalid. No changes made.` });

        if (key !== "availability") {
            res.json({ updated: true });
        } else {
            res.json({ updated: true, availability: parseInt(value) });
        }
    })
})

// get the email details from the database
app.get('/get_email_details', (req, res) => {
    const sql = "SELECT * FROM email";

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /get_email_details - Querying for Email Details: ${err}` });
        
        res.json(result);
    });
})

// update the email details
app.put('/update_email_details', (req, res) => {
    let { email_setting, email_value } = req.query;

    if (!email_setting || !email_value) return res.status(400).json({ error: "Error during execution at /update_email_details - Missing required parameters." });
    
    let sanitised_email_setting = db.escape(email_setting);

    if (email_setting.includes("_input")) {
        sanitised_email_setting = db.escape(email_setting.split("_")[0]);
    }

    const sql = `UPDATE email SET email_value = ? WHERE email_setting = ${sanitised_email_setting};`;

    db.query(sql, [email_value], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /update_email_details - Querying for Email Details: ${err}` });
        if (result.affectedRows === 0) return res.status(400).json({ error: `Error during execution at /update_email_details - Email Setting ${email_setting} is invalid. No changes made.` });

        res.json({ updated: true });
    });
});

// add a vending machine
app.post('/add_vm', (req, res) => {
    const { school, block, level, vendor, status } = req.body;

    if (!school || !block || !level || !vendor || !status) return res.status(400).json({ error: "Error during execution at /add_vm - Missing required parameters." });

    const sql1 = "INSERT INTO location VALUES (0, ?, ?, ?);";
    const sql2 = "INSERT INTO vending_machine VALUES (?, ?, ?, ?);";

    db.query(sql1, [school, block, level], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /add_vm - Querying for Location: ${err}` });

        const location_id = result.insertId;

        db.query(sql2, [location_id, location_id, vendor, status], (err1, result1) => {
            if (err1) return res.status(500).json({ error: `Error during execution at /add_vm - Querying for Vending Machine: ${err1}` });

            res.json({ added: true });
        });
    })
});

// delete a vending machine
app.delete('/delete_vm', (req, res) => {
    const { vm_id } = req.query;

    if (!vm_id) return res.status(400).json({ error: "Error during execution at /delete_vm - Missing required parameters." });

    const sql1 = "DELETE FROM location WHERE location_id = (SELECT location_id FROM vending_machine WHERE vending_machine_id = ?);";
    const sql2 = "DELETE FROM vending_item WHERE vending_machine_id = ?;";
    const sql3 = "DELETE FROM vending_payment WHERE vending_id = ?;";
    const sql4 = "DELETE FROM vending_machine WHERE vending_machine_id = ?;";

    db.query(sql1, [vm_id], (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /delete_vm - Querying for Location: ${err}` });
        if (result.affectedRows === 0) return res.status(400).json({ error: `Error during execution at /delete_vm - Vending Machine ID ${vm_id} is invalid. No changes made.` });

        db.query(sql2, [vm_id], (err1, result1) => {
            if (err1) return res.status(500).json({ error: `Error during execution at /delete_vm - Querying for Vending Items: ${err1}` });
            
            db.query(sql3, [vm_id], (err2, result2) => {
                if (err2) return res.status(500).json({ error: `Error during execution at /delete_vm - Querying for Vending Payments: ${err2}` });
            
                db.query(sql4, [vm_id], (err3, result3) => {
                    if (err3) return res.status(500).json({ error: `Error during execution at /delete_vm - Querying for Vending Machine: ${err3}` });
                    if (result.affectedRows === 0) return res.status(400).json({ error: `Error during execution at /delete_vm - Vending Machine ID ${vm_id} is invalid. No changes made.` });

                    res.json({ deleted: true });
                })
            })
        })
    })
});

// get the way IDs from the database
app.get("/get_way_ids", (req, res) => {
    let details = {};
    const sql = "SELECT location.location_id, wayid.wayid FROM location INNER JOIN wayid ON wayid.id = location.block;";

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: `Error during execution at /get_way_ids - Querying for Way IDs: ${err}` });
        
        result.forEach((row) => {
            if (!details[row.wayid]) {
                details[row.wayid] = [];
            }
            details[row.wayid] = row.location_id;
        });
        
        res.json(details);
    });
})

// page not found handler
app.get('/page_not_found', (req, res) => {
    res.status(404).sendFile(__dirname + '/templates/404.html');
});

// page not found handler
app.use((req, res, next) => {
    res.status(404).sendFile(__dirname + '/templates/404.html');
});

// start the server
app.listen(3000, () => console.log(`Server is running on http://localhost:3000`));