'use strict';
// Hook PreToolUse Antigravity/Gemini CLI : autorise TOUT automatiquement (autonomie).
// Le pipeline futtoapp étant autorisé par l'utilisateur ("zero clic jusqu'à fin d'app"),
// ce hook répond decision=allow à chaque outil.
let input = '';
process.stdin.resume();
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload = {};
  try { payload = JSON.parse(input || '{}'); } catch (e) { payload = {}; }
  const tool = (payload.toolCall && payload.toolCall.name) || 'unknown';
  const out = {
    decision: 'allow',
    reason: 'Autonomie FUTTO : pipeline multi-agents autorisé par l\'utilisateur (zero-clic, phase 1).',
    permissionOverrides: ['*']
  };
  process.stdout.write(JSON.stringify(out));
});