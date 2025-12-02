/**
 * Service de gestion Supabase pour le stockage des tokens de réinitialisation
 */
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

let supabase = null;

/**
 * Initialiser le client Supabase
 */
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('⚠️ Supabase non configuré - Utilisation de PostgreSQL local pour les tokens');
    return null;
  }

  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('✅ Supabase initialisé avec succès');
    return supabase;
  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation de Supabase:', error);
    return null;
  }
}

/**
 * Stocker un token de réinitialisation dans Supabase
 * @param {number} userId - ID de l'utilisateur
 * @param {string} token - Token de réinitialisation
 * @param {Date} expiresAt - Date d'expiration
 * @returns {Promise<Object>}
 */
async function storeResetToken(userId, token, expiresAt) {
  if (!supabase) {
    throw new Error('Supabase non initialisé');
  }

  try {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .insert([
        {
          user_id: userId,
          token: token,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    
    logger.info(`✅ Token de réinitialisation stocké dans Supabase pour user ${userId}`);
    return data[0];
  } catch (error) {
    logger.error('❌ Erreur lors du stockage du token dans Supabase:', error);
    throw error;
  }
}

/**
 * Récupérer et valider un token de réinitialisation
 * @param {string} token - Token de réinitialisation
 * @returns {Promise<Object|null>}
 */
async function getResetToken(token) {
  if (!supabase) {
    throw new Error('Supabase non initialisé');
  }

  try {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Aucun token trouvé
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('❌ Erreur lors de la récupération du token:', error);
    throw error;
  }
}

/**
 * Marquer un token comme utilisé
 * @param {string} token - Token de réinitialisation
 * @returns {Promise<void>}
 */
async function markTokenAsUsed(token) {
  if (!supabase) {
    throw new Error('Supabase non initialisé');
  }

  try {
    const { error } = await supabase
      .from('password_reset_tokens')
      .update({ 
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('token', token);

    if (error) throw error;
    
    logger.info(`✅ Token marqué comme utilisé`);
  } catch (error) {
    logger.error('❌ Erreur lors de la mise à jour du token:', error);
    throw error;
  }
}

/**
 * Nettoyer les tokens expirés (à exécuter périodiquement)
 * @returns {Promise<number>} Nombre de tokens supprimés
 */
async function cleanExpiredTokens() {
  if (!supabase) {
    return 0;
  }

  try {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) throw error;
    
    const count = data?.length || 0;
    logger.info(`✅ ${count} tokens expirés supprimés`);
    return count;
  } catch (error) {
    logger.error('❌ Erreur lors du nettoyage des tokens:', error);
    return 0;
  }
}

module.exports = {
  initializeSupabase,
  storeResetToken,
  getResetToken,
  markTokenAsUsed,
  cleanExpiredTokens
};
