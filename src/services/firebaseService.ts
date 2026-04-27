/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  getDoc, 
  collection, 
  serverTimestamp,
  initializeFirestore,
  getDocFromServer,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Piece, Side, PieceType } from '../types';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore for better control
let db: any;
const dbId = (firebaseConfig as any).firestoreDatabaseId;

try {
  if (firebaseConfig && (firebaseConfig as any).projectId) {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true, 
    }, dbId);
  } else {
    // Fallback if config is minimal
    db = getFirestore(app);
  }
} catch (e) {
  db = getFirestore(app, dbId);
}

export { db };
export const auth = getAuth();

// Anonymous auth is sometimes restricted or has errors in preview. 
// We'll skip auto-sign-in here and let the rules handle the 'true' fallback if defined.
/*
signInAnonymously(auth).then(() => {
  console.log("Signed in anonymously");
}).catch(err => {
  console.warn("Anonymous auth failed, security rules might block access:", err.message);
});
*/

async function testConnection() {
  if (!firebaseConfig || !(firebaseConfig as any).projectId) {
    console.error("Firebase config is missing or invalid!");
    return;
  }
  
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firestore connected successfully to", (firebaseConfig as any).projectId);
  } catch (error: any) {
    console.error("Firestore connectivity test failed:", error.message);
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function createRoom(roomId: string, hostName: string, pieces: Piece[]) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    // Simple verification - doesn't matter if it exists, we overwrite for host
    await setDoc(roomRef, {
      id: roomId,
      hostId: auth.currentUser?.uid || 'anon-' + Math.random().toString(36).substr(2, 5),
      redPlayerName: hostName,
      redPlayerId: auth.currentUser?.uid || 'anon-red',
      blackPlayerName: '',
      blackPlayerId: '',
      status: 'waiting',
      turn: Side.RED,
      pieces: pieces.map(p => ({ ...p })), // Clone to avoid Firestore nested issues
      updatedAt: serverTimestamp(),
      winner: null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rooms/${roomId}`);
  }
}

export async function joinRoom(roomId: string, playerName: string) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error('Phòng không tồn tại');

    const data = roomSnap.data();
    if (data.status === 'playing' && data.blackPlayerName !== playerName) {
       // Allow re-joining if name matches, else error
       throw new Error('Phòng đã đầy');
    }

    await updateDoc(roomRef, {
      blackPlayerName: playerName,
      blackPlayerId: auth.currentUser?.uid || 'anon-black',
      status: 'playing',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
  }
}

export async function updateGameState(roomId: string, pieces: Piece[], turn: Side, winner: Side | null) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      pieces,
      turn,
      winner: winner || '',
      status: winner ? 'finished' : 'playing',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rooms/${roomId}`);
  }
}

export function subscribeToRoom(roomId: string, onUpdate: (data: any) => void) {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data());
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
  });
}
