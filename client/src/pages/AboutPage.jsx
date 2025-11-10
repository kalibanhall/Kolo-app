import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { TargetIcon, UsersIcon, TrophyIcon } from '../components/Icons';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">À Propos de KOLO</h1>
          <p className="text-xl text-gray-600">
            La première plateforme de tombola digitale en République Démocratique du Congo
          </p>
        </div>

        {/* Notre Histoire */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <TrophyIcon className="w-6 h-6 mr-3 text-blue-600" />
            Notre Histoire
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            KOLO est née de la vision de démocratiser l'accès aux opportunités de gains en RDC. 
            Nous avons créé une plateforme moderne, sécurisée et accessible à tous les Congolais, 
            où la transparence et l'équité sont au cœur de chaque tirage.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Grâce à l'intégration des paiements mobile money et une interface intuitive, 
            KOLO rend les tombolas accessibles à tous, partout au Congo.
          </p>
        </section>

        {/* Nos Valeurs */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <TargetIcon className="w-6 h-6 mr-3 text-blue-600" />
            Nos Valeurs
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Transparence</h3>
              <p className="text-gray-600">
                Chaque tirage est effectué de manière transparente et vérifiable par tous les participants.
              </p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Équité</h3>
              <p className="text-gray-600">
                Tous les participants ont les mêmes chances de gagner, sans discrimination.
              </p>
            </div>
            <div className="border-l-4 border-yellow-600 pl-4">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Sécurité</h3>
              <p className="text-gray-600">
                Vos données et transactions sont protégées par des technologies de pointe.
              </p>
            </div>
            <div className="border-l-4 border-red-600 pl-4">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Accessibilité</h3>
              <p className="text-gray-600">
                Interface simple et paiements mobile money pour une accessibilité maximale.
              </p>
            </div>
          </div>
        </section>

        {/* Notre Équipe */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <UsersIcon className="w-6 h-6 mr-3 text-blue-600" />
            Notre Équipe
          </h2>
          <p className="text-gray-700 leading-relaxed">
            KOLO est portée par une équipe passionnée de développeurs, designers et experts en 
            paiements digitaux basés en RDC. Nous travaillons chaque jour pour améliorer 
            l'expérience de nos utilisateurs et garantir des tirages équitables.
          </p>
        </section>

        {/* Call to Action */}
        <div className="text-center bg-blue-600 text-white rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Rejoignez l'aventure KOLO</h2>
          <p className="mb-6">
            Participez aux prochaines campagnes et tentez votre chance de gagner !
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
