const express = require('express');
const router = express.Router();
const { pool, query } = require('../config/database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Location
 *   description: API de géolocalisation et statistiques
 */

/**
 * @swagger
 * /api/location/stats:
 *   get:
 *     summary: Obtenir les statistiques de localisation des utilisateurs
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques par ville et province
 */
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Statistiques par ville
    const cityStats = await pool.query(`
      SELECT 
        COALESCE(city, 'Non spécifié') as city,
        COUNT(*) as user_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentage
      FROM users
      GROUP BY city
      ORDER BY user_count DESC
      LIMIT 20
    `);

    // Statistiques des tickets vendus par ville
    const ticketsByCity = await pool.query(`
      SELECT 
        COALESCE(u.city, 'Non spécifié') as city,
        COUNT(t.id) as tickets_sold,
        SUM(t.price) as total_revenue
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.status = 'sold'
      GROUP BY u.city
      ORDER BY tickets_sold DESC
      LIMIT 20
    `);

    // Statistiques des nouveaux utilisateurs par ville (30 derniers jours)
    const recentUsersByCity = await pool.query(`
      SELECT 
        COALESCE(city, 'Non spécifié') as city,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY city
      ORDER BY new_users DESC
      LIMIT 10
    `);

    // Total des utilisateurs
    const totalUsers = await pool.query('SELECT COUNT(*) as total FROM users');
    const totalTickets = await pool.query("SELECT COUNT(*) as total FROM tickets WHERE status = 'sold'");

    // Mapping villes vers provinces
    const provinces = {
      'Kinshasa': 'Kinshasa',
      'Lubumbashi': 'Haut-Katanga',
      'Likasi': 'Haut-Katanga',
      'Kolwezi': 'Lualaba',
      'Mbuji-Mayi': 'Kasaï-Oriental',
      'Kananga': 'Kasaï-Central',
      'Kisangani': 'Tshopo',
      'Bukavu': 'Sud-Kivu',
      'Goma': 'Nord-Kivu',
      'Butembo': 'Nord-Kivu',
      'Beni': 'Nord-Kivu',
      'Uvira': 'Sud-Kivu',
      'Tshikapa': 'Kasaï',
      'Kikwit': 'Kwilu',
      'Matadi': 'Kongo-Central',
      'Boma': 'Kongo-Central',
      'Bandundu': 'Kwilu',
      'Mbandaka': 'Équateur',
      'Kalemie': 'Tanganyika',
      'Kindu': 'Maniema',
      'Isiro': 'Haut-Uélé',
      'Bunia': 'Ituri',
      'Gemena': 'Sud-Ubangi',
      'Gbadolite': 'Nord-Ubangi',
      'Kamina': 'Haut-Lomami',
      'Kabinda': 'Lomami',
      'Lisala': 'Mongala',
    };

    // Agréger par province
    const provinceStats = {};
    cityStats.rows.forEach(row => {
      const province = provinces[row.city] || 'Autre';
      if (!provinceStats[province]) {
        provinceStats[province] = { user_count: 0, cities: [] };
      }
      provinceStats[province].user_count += parseInt(row.user_count);
      provinceStats[province].cities.push({
        city: row.city,
        count: parseInt(row.user_count)
      });
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_users: parseInt(totalUsers.rows[0].total),
          total_tickets_sold: parseInt(totalTickets.rows[0].total),
          cities_count: cityStats.rows.length
        },
        by_city: cityStats.rows.map(row => ({
          city: row.city,
          user_count: parseInt(row.user_count),
          percentage: parseFloat(row.percentage)
        })),
        by_province: Object.entries(provinceStats).map(([province, data]) => ({
          province,
          user_count: data.user_count,
          cities: data.cities
        })).sort((a, b) => b.user_count - a.user_count),
        tickets_by_city: ticketsByCity.rows.map(row => ({
          city: row.city,
          tickets_sold: parseInt(row.tickets_sold),
          total_revenue: parseFloat(row.total_revenue || 0)
        })),
        recent_growth: recentUsersByCity.rows.map(row => ({
          city: row.city,
          new_users: parseInt(row.new_users)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * @swagger
 * /api/location/user:
 *   put:
 *     summary: Mettre à jour la localisation de l'utilisateur
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 */
router.put('/user', verifyToken, async (req, res) => {
  try {
    const { city, latitude, longitude } = req.body;
    const userId = req.user.id;

    await pool.query(`
      UPDATE users 
      SET city = $1, 
          latitude = $2, 
          longitude = $3,
          location_updated_at = NOW()
      WHERE id = $4
    `, [city, latitude || null, longitude || null, userId]);

    res.json({
      success: true,
      message: 'Localisation mise à jour'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la localisation'
    });
  }
});

/**
 * @swagger
 * /api/location/cities:
 *   get:
 *     summary: Obtenir la liste des villes disponibles
 *     tags: [Location]
 */
router.get('/cities', async (req, res) => {
  const cities = [
    'Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Kisangani',
    'Bukavu', 'Goma', 'Likasi', 'Kolwezi', 'Tshikapa',
    'Kikwit', 'Matadi', 'Uvira', 'Butembo', 'Beni',
    'Mbandaka', 'Kalemie', 'Bandundu', 'Boma', 'Kindu',
    'Isiro', 'Bunia', 'Gemena', 'Gbadolite', 'Kamina',
    'Kabinda', 'Lisala', 'Inongo', 'Kenge', 'Autre'
  ];

  res.json({
    success: true,
    data: cities
  });
});

module.exports = router;
