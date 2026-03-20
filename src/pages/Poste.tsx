const emailData = $input.first().json;
const contenu = emailData.text || emailData.textPlain || emailData.textHtml || '';
const prompt = `De: ${emailData.from}\nSujet: ${emailData.subject}\nContenu: ${contenu}`;

let dateFormatee = null;
if (emailData.date) {
  try {
    dateFormatee = new Date(emailData.date).toISOString().split('T')[0];
  } catch(e) { dateFormatee = null; }
}

// Détection pièce jointe
const attachments = emailData.attachments || [];
const hasAttachment = attachments.length > 0;

// Détection type facture
const isFacture = hasAttachment && (
  (emailData.subject || '').toLowerCase().match(/facture|invoice|paiement|payment|rechnung|quittance|recu|reçu/) ||
  attachments.some((a) => (a.filename || '').toLowerCase().match(/facture|invoice|receipt/))
);

const attachmentFolder = isFacture ? 'Factures' : 'A-trier';
let attachmentUrl = '';

// Upload pièce jointe vers Filebrowser
if (hasAttachment) {
  try {
    const att = attachments[0];
    const filename = att.filename || `piece-jointe-${Date.now()}`;
    const fileData = att.content || att.data || '';
    
    // Login Filebrowser pour obtenir le token
    const loginRes = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://files.ananda-communaute.cloud/api/login',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serge@eh-me.com: 'admin', password: 'Nathananda&babaji1969' })
    });
    
    const fbToken = loginRes;
    
    // Upload du fichier
    await this.helpers.httpRequest({
      method: 'POST',
      url: `https://files.ananda-communaute.cloud/api/resources/${attachmentFolder}/${filename}`,
      headers: {
        'X-Auth': fbToken,
        'Content-Type': 'application/octet-stream'
      },
      body: Buffer.from(fileData, 'base64')
    });
    
    attachmentUrl = `https://files.ananda-communaute.cloud/files/${attachmentFolder}/${filename}`;
  } catch(e) {
    console.error('Erreur upload pièce jointe:', e);
  }
}

// Analyse IA
const response = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://cloud.ananda-communaute.cloud/api/chat/completions',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-bd3f9e7d14b74912adfda7922795bccc'
  },
  body: JSON.stringify({
    model: 'models/gemini-2.5-flash',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant qui analyse des emails. Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans backticks. Champs : resume, priorite (haute/normale/basse), action_requise (true/false), suggestion_reponse, categorie (facture/demande/info/spam/autre)'
      },
      { role: 'user', content: prompt }
    ]
  })
});

const content = response.choices[0].message.content
  .replace(/```json/g, '').replace(/```/g, '').trim();

let analyse;
try {
  analyse = JSON.parse(content);
} catch(e) {
  analyse = { resume: content, priorite: 'normale', action_requise: false, suggestion_reponse: '', categorie: 'autre' };
}

return [{
  json: {
    "Sujet": emailData.subject || '',
    "Expéditeur": emailData.from || '',
    "Date réception": dateFormatee,
    "Résumé IA": analyse.resume || '',
    "Contenu": contenu.slice(0, 10000),
    "Action requise": analyse.action_requise || false,
    "Traité": false,
    "Compte": "ADRESSE_EMAIL_DE_LA_BOITE",
    "A une pièce jointe": hasAttachment,
    "Pièce jointe URL": attachmentUrl,
    "suggestion_reponse": analyse.suggestion_reponse || ''
  }
}];
