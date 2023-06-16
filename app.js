// Import library yang diperlukan
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const { Parser } = require('json2csv'); // Impor json2csv
const fs = require('fs');
const path = require('path');

// Inisialisasi aplikasi Express
const app = express();

// Pengaturan MySQL
const connection = mysql.createConnection({
  host: 'localhost', // Ganti dengan host MySQL Anda
  user: 'root', // Ganti dengan user MySQL Anda
  password: '', // Ganti dengan password MySQL Anda
  database: 'tugasUas' // Ganti dengan nama basis data yang diinginkan
});

// Membuat koneksi ke basis data MySQL
connection.connect(function(err) {
  if (err) throw err;
  console.log('Terhubung ke basis data MySQL');
});

// Pengaturan EJS sebagai view engine
app.set('view engine', 'ejs');

// Middleware untuk membaca data dari form
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// Tampilkan daftar pengguna
app.get('/', function(req, res) {
  connection.query('SELECT * FROM pembayaran ORDER BY status_bayar', function(err, rows) {
    if (err) throw err;
    res.render('index', { users: rows });
  });
});

// Tampilkan form tambah pengguna
app.get('/add', function(req, res) {
  res.render('add');
});

// Tambahkan pengguna ke basis data
app.post('/add', function(req, res) {
  const { id, nama, email, status_bayar } = req.body;
  const user = { id, nama, email, status_bayar };

  // Pengecekan apakah data sudah ada dalam database
  connection.query('SELECT * FROM pembayaran WHERE nama = ?', [nama], function(error, results) {
    if (error) {
      throw error;
    }

    // Jika data sudah ada, tampilkan pesan peringatan
    if (results.length > 0) {
      res.render('add', { warning: 'Data sudah ada dalam database! silahkan periksa kembali data anda' });
      return;
    }

    // Jika data belum ada, lanjutkan dengan query INSERT
    connection.query('INSERT INTO pembayaran SET ?', user, function(err) {
      if (err) {
        console.log(err.message);
        res.redirect('/add');
      } else {
        res.redirect('/');
      }
    });
  });
});

// Tampilkan form edit pengguna
app.get('/edit/:id', function(req, res) {
  const userId = req.params.id;
  connection.query('SELECT * FROM pembayaran WHERE id = ?', [userId], function(err, rows) {
    if (err) throw err;
    res.render('edit', { user: rows[0] });
  });
});

// Edit pengguna dalam basis data
app.post('/edit/:id', function(req, res) {
  const userId = req.params.id;
  const { nama, email, status_bayar } = req.body;

  connection.query(
    'UPDATE pembayaran SET nama = ?, email = ?, status_bayar = ? WHERE id = ?',
    [nama, email, status_bayar, userId],
    function(err) {
      if (err) {
        console.log(err.message);
        res.redirect(`/edit/${userId}`);
      } else {
        res.redirect('/');
      }
    }
  );
});

// Hapus pengguna dari basis data
app.get('/delete/:id', function(req, res) {
  const userId = req.params.id;
  connection.query('DELETE FROM pembayaran WHERE id = ?', [userId], function(err) {
    if (err) throw err;
    res.redirect('/');
  });
});

// Rute untuk mengunduh data terpilih
app.post('/download-selected', function(req, res) {
  const selectedIds = req.body.ids;

  // Query ke basis data untuk mendapatkan data terpilih
  connection.query(
    'SELECT * FROM pembayaran WHERE id IN (?)',
    [selectedIds],
    function(err, results) {
      if (err) {
        console.log(err.message);
        res.status(500).json({ error: 'Terjadi kesalahan dalam mengunduh data.' });
      } else {
        const filename = 'data_terpilih.csv';

        // Konversi data menjadi format CSV
        const fields = ['id', 'nama', 'email', 'status_bayar'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(results);

        // Menyimpan file CSV
        const filePath = path.join(__dirname, 'public', filename);
        fs.writeFile(filePath, csv, function(err) {
          if (err) {
            console.log(err.message);
            res.status(500).json({ error: 'Terjadi kesalahan dalam menyimpan file.' });
          } else {
            // Mengirimkan file CSV sebagai respon dengan nama file yang valid
            res.download(filePath, filename, function(err) {
              if (err) {
                console.log(err.message);
                res.status(500).json({ error: 'Terjadi kesalahan dalam mengunduh file.' });
              } else {
                // Menghapus file CSV setelah diunduh
                fs.unlinkSync(filePath);
              }
            });
          }
        });
      }
    }
  );
});

// Rute untuk mengunduh file
app.get('/download-file', function(req, res) {
  const filename = req.query.filename;
  const filePath = path.join(__dirname, 'public', filename);

  // Memeriksa keberadaan file yang ingin diunduh
  fs.access(filePath, fs.constants.F_OK, function(err) {
    if (err) {
      console.log(err.message);
      res.status(404).json({ error: 'File tidak ditemukan.' });
    } else {
      // Mengirimkan file sebagai respon dengan nama file yang valid
      res.download(filePath, filename, function(err) {
        if (err) {
          console.log(err.message);
          res.status(500).json({ error: 'Terjadi kesalahan dalam mengunduh file.' });
        }
      });
    }
  });
});


// Jalankan server pada port 3000
app.listen(3000, function() {
  console.log('Server berjalan di http://localhost:3000');
});
