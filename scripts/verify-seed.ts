import 'dotenv/config';
import { strict as assert } from 'node:assert';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Participant } from '../src/services/room.entry';

async function verify() {
  const clients: Socket[] = [];
  try {
    for (const letter of ['A', 'B', 'C']) {
      const email = process.env['SEED_' + letter + '_EMAIL'];
      const password = process.env['SEED_' + letter + '_PASSWORD'];
      if (!email || !password) throw new Error('Faltan las variables SEED_' + letter + ' del README.');
      const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('El emulador rechazó el ingreso de Demo' + letter);
      const { idToken } = await response.json() as { idToken: string };
      const socket = io('http://127.0.0.1:' + (process.env.PORT || '4000'), {
        autoConnect: false, reconnection: false, timeout: 8000, auth: { token: idToken },
      });
      clients.push(socket);
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
        socket.connect();
      });
      const roomId = letter === 'C' ? 'DEMA2222' : 'DEMB3333';
      let roster: Participant[] = [];
      socket.once('room:participants', data => { roster = data.participants; });
      const ack = await socket.timeout(8000).emitWithAck('room:join', { roomId });
      assert.equal(ack.ok, true, 'Falló el ingreso a ' + roomId);
      const expected = letter === 'B' ? ['A', 'B'] : [letter];
      assert.deepEqual(roster.map(p => p.uid).sort(), expected.map(l => 'ts08-demo-' + l));
      assert.ok(roster.every(p => p.name && p.avatar));
    }
    console.log('TS-08: las tres cuentas ingresaron; dos salas con presencia independiente.');
  } finally { clients.forEach(client => client.disconnect()); }
}

verify().catch(error => { console.error(error.message); process.exitCode = 1; });
