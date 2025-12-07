import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { TargetIcon, ChartIcon, UsersIcon } from '../components/Icons';

const VisionPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Navbar />
      <div className="h-14 sm:h-16" /> {/* Spacer for fixed navbar */}
      
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Notre Vision</h1>
          <p className="text-xl text-gray-600">
            Construire l'avenir des jeux de hasard équitables en Afrique
          </p>
        </div>

        {/* Vision Principale */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start mb-4">
            <TargetIcon className="w-12 h-12 mr-4 flex-shrink-0" />
            <div>
              <h2 className="text-3xl font-bold mb-4">Notre Vision 2030</h2>
              <p className="text-lg leading-relaxed">
                Devenir la plateforme de tombola numéro 1 en République Démocratique du Congo 
                et s'étendre dans toute l'Afrique francophone, en offrant des opportunités de 
                gains transparentes, sécurisées et accessibles à tous.
              </p>
            </div>
          </div>
        </section>

        {/* Nos Objectifs */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Nos Objectifs Stratégiques</h2>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-3 mr-4 flex-shrink-0">
                <ChartIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Croissance et Expansion
                </h3>
                <p className="text-gray-700">
                  Atteindre 1 million d'utilisateurs actifs d'ici 2027 et étendre nos services 
                  dans 10 pays africains d'ici 2030.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-green-100 rounded-full p-3 mr-4 flex-shrink-0">
                <UsersIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Inclusion Financière
                </h3>
                <p className="text-gray-700">
                  Permettre à chaque Congolais, quel que soit son niveau de revenu ou sa localisation, 
                  d'accéder à des opportunités de gains légitimes et équitables.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-yellow-100 rounded-full p-3 mr-4 flex-shrink-0">
                <TargetIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  Innovation Continue
                </h3>
                <p className="text-gray-700">
                  Intégrer les dernières technologies blockchain pour une transparence maximale 
                  et développer de nouvelles fonctionnalités basées sur l'IA.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Social */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Notre Impact Social</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Au-delà des gains individuels, KOLO s'engage à créer un impact positif dans la société congolaise :
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span className="text-gray-700">
                Création d'emplois dans le secteur du digital et des paiements mobiles
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span className="text-gray-700">
                Promotion de l'inclusion financière et de l'alphabétisation numérique
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span className="text-gray-700">
                Soutien aux initiatives communautaires à travers des campagnes caritatives
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">•</span>
              <span className="text-gray-700">
                Contribution au développement de l'écosystème fintech congolais
              </span>
            </li>
          </ul>
        </section>

        {/* Engagement */}
        <section className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Notre Engagement</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Chez KOLO, nous croyons que la technologie doit servir l'humain. C'est pourquoi 
            nous nous engageons à :
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">Transparence Totale</p>
              <p className="text-sm text-gray-600">
                Publication des résultats en temps réel et vérification possible par tous
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">Jeu Responsable</p>
              <p className="text-sm text-gray-600">
                Limites de dépenses et outils de prévention contre l'addiction
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">Support Client 24/7</p>
              <p className="text-sm text-gray-600">
                Assistance disponible à tout moment pour nos utilisateurs
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">Protection des Données</p>
              <p className="text-sm text-gray-600">
                Sécurité maximale et respect de la vie privée de nos utilisateurs
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Découvrir les Campagnes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VisionPage;
