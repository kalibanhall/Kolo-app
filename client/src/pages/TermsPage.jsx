import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { LogoKolo } from '../components/LogoKolo';

export const TermsPage = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 backdrop-blur-lg border-b transition-colors ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105 ${
              isDarkMode 
                ? 'text-cyan-400 hover:bg-gray-800' 
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Retour</span>
          </button>
          
          <div className="flex items-center gap-3">
            <LogoKolo size="small" />
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Conditions Générales
            </h1>
          </div>
          
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Content Card */}
        <div className={`rounded-2xl overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800/50 border border-gray-700 backdrop-blur-sm' 
            : 'bg-white shadow-xl'
        }`}>
          <div className="p-6 sm:p-8">
            <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Conditions Générales d'Utilisation
            </h2>
            
            <div className={`space-y-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {/* Article 1 */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                  Article 1 - Objet
                </h3>
                <p className="leading-relaxed">
                  Les présentes conditions générales d'utilisation régissent l'achat de tickets de tombola 
                  sur la plateforme KOLO. En achetant un ticket, vous acceptez sans réserve les présentes 
                  conditions générales d'utilisation.
                </p>
              </section>

              {/* Article 2 */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                  Article 2 - Participation
                </h3>
                <p className="leading-relaxed mb-2">
                  La participation à la tombola KOLO est ouverte à toute personne physique majeure 
                  résidant en République Démocratique du Congo ou dans tout autre pays où la 
                  participation est légale.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Chaque participant doit créer un compte avec des informations véridiques</li>
                  <li>Un participant peut acheter plusieurs tickets</li>
                  <li>La limite est de 5 tickets par transaction</li>
                </ul>
              </section>

              {/* Article 3 */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                  Article 3 - Prix et Paiement
                </h3>
                <p className="leading-relaxed mb-2">
                  Le prix du ticket est indiqué en dollars américains (USD) et peut être payé :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Via le portefeuille KOLO (en Francs Congolais - CDF)</li>
                  <li>Via Mobile Money (Orange Money, M-Pesa, Airtel Money, Afrimoney)</li>
                </ul>
                <p className="leading-relaxed mt-2">
                  Le taux de conversion USD/CDF est affiché au moment de l'achat. 
                  Une fois le paiement effectué, il ne peut être remboursé sauf en cas d'annulation 
                  de la campagne par KOLO.
                </p>
              </section>

              {/* Article 4 */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                  Article 4 - Tirage au Sort
                </h3>
                <p className="leading-relaxed">
                  Le tirage au sort est effectué de manière aléatoire et transparente. 
                  La date du tirage est communiquée sur la page de la campagne. 
                  Le gagnant sera notifié par email et/ou par téléphone. 
                  Les résultats seront publiés sur la plateforme.
                </p>
              </section>

              {/* Article 5 */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                  Article 5 - Lots
                </h3>
                <p className="leading-relaxed">
                  Les lots mis en jeu sont décrits sur la page de chaque campagne. 
                  Le lot principal ne peut être échangé contre sa valeur en espèces. 
                  Le gagnant dispose de 30 jours pour réclamer son lot.
                </p>
              </section>

              {/* Article 6 */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                  Article 6 - Responsabilité
                </h3>
                <p className="leading-relaxed">
                  KOLO ne saurait être tenu responsable des dysfonctionnements techniques 
                  indépendants de sa volonté. En cas d'annulation d'une campagne, 
                  les participants seront remboursés intégralement sur leur portefeuille KOLO.
                </p>
              </section>

              {/* Article 7 */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                  Article 7 - Protection des Données
                </h3>
                <p className="leading-relaxed">
                  Les données personnelles collectées sont utilisées uniquement dans le cadre 
                  de la gestion de la tombola. Elles ne seront jamais vendues à des tiers. 
                  Conformément à la loi, vous disposez d'un droit d'accès, de modification 
                  et de suppression de vos données.
                </p>
              </section>

              {/* Article 8 */}
              <section>
                <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>
                  Article 8 - Contact
                </h3>
                <p className="leading-relaxed">
                  Pour toute question concernant ces conditions générales ou la plateforme KOLO, 
                  vous pouvez nous contacter via :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>Email : support@kolo.cd</li>
                  <li>La page Contact de notre site</li>
                </ul>
              </section>

              {/* Date */}
              <div className={`pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Dernière mise à jour : 31 décembre 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
