import React, { createContext, useContext, useState, useEffect } from 'react';

interface TranslationContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation & Header
    'dashboard': 'Dashboard',
    'stats': 'Stats',
    'inventory': 'Parts Inventory',
    'signOut': 'Sign Out',
    
    // Dashboard
    'goodMorning': 'Good Morning',
    'goodAfternoon': 'Good Afternoon',
    'goodEvening': 'Good Evening',
    'welcomeBack': 'Welcome back! Ready for your next ride?',
    'myBikes': 'My Bikes',
    'addBike': 'Add Bike',
    'editBike': 'Edit Bike',
    'manageParts': 'Manage Parts',
    'connectStrava': 'Connect to Strava',
    'syncStrava': 'Sync Strava Data',
    
    // Bike Details
    'bikeName': 'Bike Name',
    'brand': 'Brand',
    'model': 'Model',
    'type': 'Type',
    'year': 'Year',
    'weight': 'Weight (kg)',
    'price': 'Purchase Price (€)',
    'totalDistance': 'Total Distance (km)',
    'currentDistance': 'Current Total Distance (km)',
    'bikeImage': 'Bike Image',
    
    // Bike Types
    'road': 'Road Bike',
    'gravel': 'Gravel Bike',
    'mountain': 'Mountain Bike',
    'hybrid': 'Hybrid',
    'bmx': 'BMX',
    'electric': 'Electric',
    
    // Actions
    'add': 'Add',
    'edit': 'Edit',
    'delete': 'Delete',
    'cancel': 'Cancel',
    'save': 'Save',
    'update': 'Update',
    'upload': 'Upload',
    'loading': 'Loading...',
    'adding': 'Adding...',
    'updating': 'Updating...',
    
    // Messages
    'bikeAddedSuccess': 'Bike added successfully!',
    'bikeUpdatedSuccess': 'Bike updated successfully!',
    'errorAddingBike': 'Error adding bike',
    'errorUpdatingBike': 'Error updating bike',
    'imageUploadedSuccess': 'Image uploaded successfully!',
    'errorUploadingImage': 'Failed to upload image',
    
    // Parts & Components
    'wearProgress': 'Wear Progress',
    'partsInventory': 'Parts Inventory',
    'components': 'Components',
    'replacement': 'Replacement',
    'maintenance': 'Maintenance',
    
    // Upload
    'clickToUpload': 'Click to upload',
    'dragAndDrop': 'PNG, JPG up to 10MB',
    'uploading': 'Uploading...',
    
    // Placeholders
    'enterBikeName': 'e.g., My Road Bike, Trail Beast',
    'selectBikeType': 'Select bike type',
    'optional': 'Optional',
    
    // User profile translations
    'userProfile': 'User Profile',
    'memberSince': 'Member since',
    'garageValue': 'Garage Value',
    'partsValue': 'Parts Value',
    'parts': 'Parts',
    'bikes': 'Bikes',
  },
  
  fr: {
    // Navigation & Header
    'dashboard': 'Tableau de bord',
    'stats': 'Statistiques',
    'inventory': 'Inventaire des pièces',
    'signOut': 'Se déconnecter',
    
    // Dashboard
    'goodMorning': 'Bonjour',
    'goodAfternoon': 'Bon après-midi',
    'goodEvening': 'Bonsoir',
    'welcomeBack': 'Bon retour ! Prêt pour votre prochaine sortie ?',
    'myBikes': 'Mes vélos',
    'addBike': 'Ajouter un vélo',
    'editBike': 'Modifier le vélo',
    'manageParts': 'Gérer les pièces',
    'connectStrava': 'Se connecter à Strava',
    'syncStrava': 'Synchroniser Strava',
    
    // Bike Details
    'bikeName': 'Nom du vélo',
    'brand': 'Marque',
    'model': 'Modèle',
    'type': 'Type',
    'year': 'Année',
    'weight': 'Poids (kg)',
    'price': 'Prix d\'achat (€)',
    'totalDistance': 'Distance totale (km)',
    'currentDistance': 'Distance totale actuelle (km)',
    'bikeImage': 'Image du vélo',
    
    // Bike Types
    'road': 'Vélo de route',
    'gravel': 'Vélo gravel',
    'mountain': 'VTT',
    'hybrid': 'Hybride',
    'bmx': 'BMX',
    'electric': 'Électrique',
    
    // Actions
    'add': 'Ajouter',
    'edit': 'Modifier',
    'delete': 'Supprimer',
    'cancel': 'Annuler',
    'save': 'Enregistrer',
    'update': 'Mettre à jour',
    'upload': 'Télécharger',
    'loading': 'Chargement...',
    'adding': 'Ajout...',
    'updating': 'Mise à jour...',
    
    // Messages
    'bikeAddedSuccess': 'Vélo ajouté avec succès !',
    'bikeUpdatedSuccess': 'Vélo mis à jour avec succès !',
    'errorAddingBike': 'Erreur lors de l\'ajout du vélo',
    'errorUpdatingBike': 'Erreur lors de la mise à jour du vélo',
    'imageUploadedSuccess': 'Image téléchargée avec succès !',
    'errorUploadingImage': 'Échec du téléchargement de l\'image',
    
    // Parts & Components
    'wearProgress': 'Usure des composants',
    'partsInventory': 'Inventaire des pièces',
    'components': 'Composants',
    'replacement': 'Remplacement',
    'maintenance': 'Maintenance',
    
    // Upload
    'clickToUpload': 'Cliquer pour télécharger',
    'dragAndDrop': 'PNG, JPG jusqu\'à 10MB',
    'uploading': 'Téléchargement...',
    
    // Placeholders
    'enterBikeName': 'ex: Mon vélo de route, Bête de piste',
    'selectBikeType': 'Sélectionner le type de vélo',
    'optional': 'Optionnel',
    
    // User profile translations
    'userProfile': 'Profil Utilisateur',
    'memberSince': 'Membre depuis',
    'garageValue': 'Valeur Garage',
    'partsValue': 'Valeur Pièces',
    'parts': 'Pièces',
    'bikes': 'Vélos',
  },
  
  de: {
    // Navigation & Header
    'dashboard': 'Dashboard',
    'stats': 'Statistiken',
    'inventory': 'Teileinventar',
    'signOut': 'Abmelden',
    
    // Dashboard
    'goodMorning': 'Guten Morgen',
    'goodAfternoon': 'Guten Tag',
    'goodEvening': 'Guten Abend',
    'welcomeBack': 'Willkommen zurück! Bereit für die nächste Fahrt?',
    'myBikes': 'Meine Fahrräder',
    'addBike': 'Fahrrad hinzufügen',
    'editBike': 'Fahrrad bearbeiten',
    'manageParts': 'Teile verwalten',
    'connectStrava': 'Mit Strava verbinden',
    'syncStrava': 'Strava-Daten synchronisieren',
    
    // Bike Details
    'bikeName': 'Fahrradname',
    'brand': 'Marke',
    'model': 'Modell',
    'type': 'Typ',
    'year': 'Jahr',
    'weight': 'Gewicht (kg)',
    'price': 'Kaufpreis (€)',
    'totalDistance': 'Gesamtdistanz (km)',
    'currentDistance': 'Aktuelle Gesamtdistanz (km)',
    'bikeImage': 'Fahrradbild',
    
    // Bike Types
    'road': 'Rennrad',
    'gravel': 'Gravel-Bike',
    'mountain': 'Mountainbike',
    'hybrid': 'Hybrid',
    'bmx': 'BMX',
    'electric': 'E-Bike',
    
    // Actions
    'add': 'Hinzufügen',
    'edit': 'Bearbeiten',
    'delete': 'Löschen',
    'cancel': 'Abbrechen',
    'save': 'Speichern',
    'update': 'Aktualisieren',
    'upload': 'Hochladen',
    'loading': 'Lädt...',
    'adding': 'Hinzufügen...',
    'updating': 'Aktualisieren...',
    
    // Messages
    'bikeAddedSuccess': 'Fahrrad erfolgreich hinzugefügt!',
    'bikeUpdatedSuccess': 'Fahrrad erfolgreich aktualisiert!',
    'errorAddingBike': 'Fehler beim Hinzufügen des Fahrrads',
    'errorUpdatingBike': 'Fehler beim Aktualisieren des Fahrrads',
    'imageUploadedSuccess': 'Bild erfolgreich hochgeladen!',
    'errorUploadingImage': 'Fehler beim Hochladen des Bildes',
    
    // Parts & Components
    'wearProgress': 'Verschleißfortschritt',
    'partsInventory': 'Teileinventar',
    'components': 'Komponenten',
    'replacement': 'Ersatz',
    'maintenance': 'Wartung',
    
    // Upload
    'clickToUpload': 'Zum Hochladen klicken',
    'dragAndDrop': 'PNG, JPG bis 10MB',
    'uploading': 'Hochladen...',
    
    // Placeholders
    'enterBikeName': 'z.B. Mein Rennrad, Trail Beast',
    'selectBikeType': 'Fahrradtyp auswählen',
    'optional': 'Optional',
    
    // User profile translations
    'userProfile': 'Benutzerprofil',
    'memberSince': 'Mitglied seit',
    'garageValue': 'Garage Wert',
    'partsValue': 'Teile Wert',
    'parts': 'Teile',
    'bikes': 'Fahrräder',
  },
  
  nl: {
    // Navigation & Header
    'dashboard': 'Dashboard',
    'stats': 'Statistieken',
    'inventory': 'Onderdelen inventaris',
    'signOut': 'Uitloggen',
    
    // Dashboard
    'goodMorning': 'Goedemorgen',
    'goodAfternoon': 'Goedemiddag',
    'goodEvening': 'Goedenavond',
    'welcomeBack': 'Welkom terug! Klaar voor je volgende rit?',
    'myBikes': 'Mijn fietsen',
    'addBike': 'Fiets toevoegen',
    'editBike': 'Fiets bewerken',
    'manageParts': 'Onderdelen beheren',
    'connectStrava': 'Verbinden met Strava',
    'syncStrava': 'Strava-gegevens synchroniseren',
    
    // Bike Details
    'bikeName': 'Fietsnaam',
    'brand': 'Merk',
    'model': 'Model',
    'type': 'Type',
    'year': 'Jaar',
    'weight': 'Gewicht (kg)',
    'price': 'Aankoopprijs (€)',
    'totalDistance': 'Totale afstand (km)',
    'currentDistance': 'Huidige totale afstand (km)',
    'bikeImage': 'Fietsafbeelding',
    
    // Bike Types
    'road': 'Racefiets',
    'gravel': 'Gravel bike',
    'mountain': 'Mountainbike',
    'hybrid': 'Hybride',
    'bmx': 'BMX',
    'electric': 'Elektrisch',
    
    // Actions
    'add': 'Toevoegen',
    'edit': 'Bewerken',
    'delete': 'Verwijderen',
    'cancel': 'Annuleren',
    'save': 'Opslaan',
    'update': 'Bijwerken',
    'upload': 'Uploaden',
    'loading': 'Laden...',
    'adding': 'Toevoegen...',
    'updating': 'Bijwerken...',
    
    // Messages
    'bikeAddedSuccess': 'Fiets succesvol toegevoegd!',
    'bikeUpdatedSuccess': 'Fiets succesvol bijgewerkt!',
    'errorAddingBike': 'Fout bij toevoegen fiets',
    'errorUpdatingBike': 'Fout bij bijwerken fiets',
    'imageUploadedSuccess': 'Afbeelding succesvol geüpload!',
    'errorUploadingImage': 'Fout bij uploaden afbeelding',
    
    // Parts & Components
    'wearProgress': 'Slijtage voortgang',
    'partsInventory': 'Onderdelen inventaris',
    'components': 'Componenten',
    'replacement': 'Vervanging',
    'maintenance': 'Onderhoud',
    
    // Upload
    'clickToUpload': 'Klik om te uploaden',
    'dragAndDrop': 'PNG, JPG tot 10MB',
    'uploading': 'Uploaden...',
    
    // Placeholders
    'enterBikeName': 'bijv. Mijn racefiets, Trail Beast',
    'selectBikeType': 'Selecteer fietstype',
    'optional': 'Optioneel',
    
    // User profile translations
    'userProfile': 'Gebruikersprofiel',
    'memberSince': 'Lid sinds',
    'garageValue': 'Garage Waarde',
    'partsValue': 'Onderdelen Waarde',
    'parts': 'Onderdelen',
    'bikes': 'Fietsen',
  },
  
  it: {
    // Navigation & Header
    'dashboard': 'Dashboard',
    'stats': 'Statistiche',
    'inventory': 'Inventario parti',
    'signOut': 'Esci',
    
    // Dashboard
    'goodMorning': 'Buongiorno',
    'goodAfternoon': 'Buon pomeriggio',
    'goodEvening': 'Buonasera',
    'welcomeBack': 'Bentornato! Pronto per la prossima pedalata?',
    'myBikes': 'Le mie bici',
    'addBike': 'Aggiungi bici',
    'editBike': 'Modifica bici',
    'manageParts': 'Gestisci parti',
    'connectStrava': 'Connetti a Strava',
    'syncStrava': 'Sincronizza dati Strava',
    
    // Bike Details
    'bikeName': 'Nome bici',
    'brand': 'Marca',
    'model': 'Modello',
    'type': 'Tipo',
    'year': 'Anno',
    'weight': 'Peso (kg)',
    'price': 'Prezzo d\'acquisto (€)',
    'totalDistance': 'Distanza totale (km)',
    'currentDistance': 'Distanza totale attuale (km)',
    'bikeImage': 'Immagine bici',
    
    // Bike Types
    'road': 'Bici da corsa',
    'gravel': 'Gravel bike',
    'mountain': 'Mountain bike',
    'hybrid': 'Ibrida',
    'bmx': 'BMX',
    'electric': 'Elettrica',
    
    // Actions
    'add': 'Aggiungi',
    'edit': 'Modifica',
    'delete': 'Elimina',
    'cancel': 'Annulla',
    'save': 'Salva',
    'update': 'Aggiorna',
    'upload': 'Carica',
    'loading': 'Caricamento...',
    'adding': 'Aggiungendo...',
    'updating': 'Aggiornando...',
    
    // Messages
    'bikeAddedSuccess': 'Bici aggiunta con successo!',
    'bikeUpdatedSuccess': 'Bici aggiornata con successo!',
    'errorAddingBike': 'Errore nell\'aggiunta della bici',
    'errorUpdatingBike': 'Errore nell\'aggiornamento della bici',
    'imageUploadedSuccess': 'Immagine caricata con successo!',
    'errorUploadingImage': 'Errore nel caricamento dell\'immagine',
    
    // Parts & Components
    'wearProgress': 'Progresso usura',
    'partsInventory': 'Inventario parti',
    'components': 'Componenti',
    'replacement': 'Sostituzione',
    'maintenance': 'Manutenzione',
    
    // Upload
    'clickToUpload': 'Clicca per caricare',
    'dragAndDrop': 'PNG, JPG fino a 10MB',
    'uploading': 'Caricamento...',
    
    // Placeholders
    'enterBikeName': 'es. La mia bici da corsa, Trail Beast',
    'selectBikeType': 'Seleziona tipo di bici',
    'optional': 'Opzionale',
    
    // User profile translations
    'userProfile': 'Profilo Utente',
    'memberSince': 'Membro dal',
    'garageValue': 'Valore Garage',
    'partsValue': 'Valore Parti',
    'parts': 'Parti',
    'bikes': 'Bici',
  },
  
  es: {
    // Navigation & Header
    'dashboard': 'Panel',
    'stats': 'Estadísticas',
    'inventory': 'Inventario de piezas',
    'signOut': 'Cerrar sesión',
    
    // Dashboard
    'goodMorning': 'Buenos días',
    'goodAfternoon': 'Buenas tardes',
    'goodEvening': 'Buenas noches',
    'welcomeBack': '¡Bienvenido de vuelta! ¿Listo para tu próxima ruta?',
    'myBikes': 'Mis bicicletas',
    'addBike': 'Añadir bicicleta',
    'editBike': 'Editar bicicleta',
    'manageParts': 'Gestionar piezas',
    'connectStrava': 'Conectar con Strava',
    'syncStrava': 'Sincronizar datos de Strava',
    
    // Bike Details
    'bikeName': 'Nombre de la bicicleta',
    'brand': 'Marca',
    'model': 'Modelo',
    'type': 'Tipo',
    'year': 'Año',
    'weight': 'Peso (kg)',
    'price': 'Precio de compra (€)',
    'totalDistance': 'Distancia total (km)',
    'currentDistance': 'Distancia total actual (km)',
    'bikeImage': 'Imagen de la bicicleta',
    
    // Bike Types
    'road': 'Bicicleta de carretera',
    'gravel': 'Bicicleta gravel',
    'mountain': 'Bicicleta de montaña',
    'hybrid': 'Híbrida',
    'bmx': 'BMX',
    'electric': 'Eléctrica',
    
    // Actions
    'add': 'Añadir',
    'edit': 'Editar',
    'delete': 'Eliminar',
    'cancel': 'Cancelar',
    'save': 'Guardar',
    'update': 'Actualizar',
    'upload': 'Subir',
    'loading': 'Cargando...',
    'adding': 'Añadiendo...',
    'updating': 'Actualizando...',
    
    // Messages
    'bikeAddedSuccess': '¡Bicicleta añadida con éxito!',
    'bikeUpdatedSuccess': '¡Bicicleta actualizada con éxito!',
    'errorAddingBike': 'Error al añadir la bicicleta',
    'errorUpdatingBike': 'Error al actualizar la bicicleta',
    'imageUploadedSuccess': '¡Imagen subida con éxito!',
    'errorUploadingImage': 'Error al subir la imagen',
    
    // Parts & Components
    'wearProgress': 'Progreso de desgaste',
    'partsInventory': 'Inventario de piezas',
    'components': 'Componentes',
    'replacement': 'Reemplazo',
    'maintenance': 'Mantenimiento',
    
    // Upload
    'clickToUpload': 'Hacer clic para subir',
    'dragAndDrop': 'PNG, JPG hasta 10MB',
    'uploading': 'Subiendo...',
    
    // Placeholders
    'enterBikeName': 'ej. Mi bici de carretera, Trail Beast',
    'selectBikeType': 'Seleccionar tipo de bicicleta',
    'optional': 'Opcional',
    
    // User profile translations
    'userProfile': 'Perfil de Usuario',
    'memberSince': 'Miembro desde',
    'garageValue': 'Valor Garage',
    'partsValue': 'Valor Piezas',
    'parts': 'Piezas',
    'bikes': 'Bicicletas',
  },
  
  da: {
    // Navigation & Header
    'dashboard': 'Dashboard',
    'stats': 'Statistikker',
    'inventory': 'Dele lager',
    'signOut': 'Log ud',
    
    // Dashboard
    'goodMorning': 'Godmorgen',
    'goodAfternoon': 'God eftermiddag',
    'goodEvening': 'God aften',
    'welcomeBack': 'Velkommen tilbage! Klar til din næste tur?',
    'myBikes': 'Mine cykler',
    'addBike': 'Tilføj cykel',
    'editBike': 'Rediger cykel',
    'manageParts': 'Administrer dele',
    'connectStrava': 'Forbind til Strava',
    'syncStrava': 'Synkroniser Strava data',
    
    // Bike Details
    'bikeName': 'Cykelnavn',
    'brand': 'Mærke',
    'model': 'Model',
    'type': 'Type',
    'year': 'År',
    'weight': 'Vægt (kg)',
    'price': 'Købspris (€)',
    'totalDistance': 'Total distance (km)',
    'currentDistance': 'Nuværende total distance (km)',
    'bikeImage': 'Cykelbillede',
    
    // Bike Types
    'road': 'Racercykel',
    'gravel': 'Gravel cykel',
    'mountain': 'Mountainbike',
    'hybrid': 'Hybrid',
    'bmx': 'BMX',
    'electric': 'Elektrisk',
    
    // Actions
    'add': 'Tilføj',
    'edit': 'Rediger',
    'delete': 'Slet',
    'cancel': 'Annuller',
    'save': 'Gem',
    'update': 'Opdater',
    'upload': 'Upload',
    'loading': 'Indlæser...',
    'adding': 'Tilføjer...',
    'updating': 'Opdaterer...',
    
    // Messages
    'bikeAddedSuccess': 'Cykel tilføjet med succes!',
    'bikeUpdatedSuccess': 'Cykel opdateret med succes!',
    'errorAddingBike': 'Fejl ved tilføjelse af cykel',
    'errorUpdatingBike': 'Fejl ved opdatering af cykel',
    'imageUploadedSuccess': 'Billede uploadet med succes!',
    'errorUploadingImage': 'Fejl ved upload af billede',
    
    // Parts & Components
    'wearProgress': 'Slitage fremskridt',
    'partsInventory': 'Dele lager',
    'components': 'Komponenter',
    'replacement': 'Udskiftning',
    'maintenance': 'Vedligeholdelse',
    
    // Upload
    'clickToUpload': 'Klik for at uploade',
    'dragAndDrop': 'PNG, JPG op til 10MB',
    'uploading': 'Uploader...',
    
    // Placeholders
    'enterBikeName': 'f.eks. Min racercykel, Trail Beast',
    'selectBikeType': 'Vælg cykeltype',
    'optional': 'Valgfri',
    
    // User profile translations
    'userProfile': 'Brugerprofil',
    'memberSince': 'Medlem siden',
    'garageValue': 'Garage Værdi',
    'partsValue': 'Dele Værdi',
    'parts': 'Dele',
    'bikes': 'Cykler',
  },
};

const TranslationContext = createContext<TranslationContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('preferred-language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('preferred-language', language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[language as keyof typeof translations];
    return translation?.[key as keyof typeof translation] || translations.en[key as keyof typeof translations.en] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};