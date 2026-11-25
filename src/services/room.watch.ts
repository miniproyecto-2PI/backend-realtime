import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAuth } from '../config/firebase';

export type WatchRoom = (
  id: string, changed: (name: string | null) => void, failed: (error: Error) => void
) => () => void;

export const watchRoom: WatchRoom = (id, changed, failed) =>
  getFirestore(getFirebaseAuth().app).collection('rooms').doc(id).onSnapshot(
    snapshot => changed(snapshot.exists ? snapshot.get('name') : null), failed
  );
