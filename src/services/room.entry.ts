import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAuth } from '../config/firebase';
import { AuthUser } from '../types/auth.types';

export interface Participant {
  uid: string;
  name: string;
  avatar: string | null;
}

export type LookupEntry = (id: string, user: AuthUser) => Promise<Participant | null>;

export const lookupEntry: LookupEntry = async (id, user) => {
  const db = getFirestore(getFirebaseAuth().app);
  const [room, profile] = await db.getAll(db.collection('rooms').doc(id), db.collection('users').doc(user.uid));
  if (!room.exists || room.get('deleting') === true) return null;
  const data = profile.data();
  return {
    uid: user.uid,
    name: data?.username || user.name || 'Participante',
    avatar: data?.avatar ?? user.picture,
  };
};
