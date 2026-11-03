const RULES = "firestore.rules";

import { readFileSync } from 'node:fs';
import { test, before, beforeEach, after } from 'node:test';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-haru-help',
    firestore: {
      rules: readFileSync(new URL(RULES, import.meta.url), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users/cust01'), {
        name: '연습 손님', role: 'customer',
      }),
      setDoc(doc(db, 'questions/q1'), {
        uid: 'cust01', text: '택배는 언제 와요?', status: 'waiting',
      }),
      setDoc(doc(db, 'kb/k01'), {
        title: '배송 기간', text: '평일 기준 1~2일 안에 보냅니다', category: '배송',
      }),
    ]);
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test('허용 - cust01 이 자기 질문 questions/q1 을 읽는다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertSucceeds(getDoc(doc(db, 'questions/q1')));
});

test('거부 - cust02 가 남의 질문 questions/q1 을 읽는다', async () => {
  const db = testEnv.authenticatedContext('cust02').firestore();
  await assertFails(getDoc(doc(db, 'questions/q1')));
});

test('거부 - 로그인 안 한 사람이 questions/q1 을 읽는다', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'questions/q1')));
});

test('허용 - cust01 이 questions/q2 를 자기 UID와 waiting 상태로 만든다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertSucceeds(setDoc(doc(db, 'questions/q2'), {
    uid: 'cust01', text: '환불돼요?', status: 'waiting',
  }));
});

test('거부 - cust01 이 questions/q2 를 uid cust02 로 만든다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertFails(setDoc(doc(db, 'questions/q2'), {
    uid: 'cust02', text: '환불돼요?', status: 'waiting',
  }));
});

test('거부 - cust01 이 questions/q2 를 status answered 로 만든다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertFails(setDoc(doc(db, 'questions/q2'), {
    uid: 'cust01', text: '환불돼요?', status: 'answered',
  }));
});

test('거부 - cust01 이 questions/q2 를 answer 칸을 채워 만든다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertFails(setDoc(doc(db, 'questions/q2'), {
    uid: 'cust01', text: '환불돼요?', status: 'waiting', answer: '환불 가능합니다.',
  }));
});

test('거부 - cust01 이 자기 질문 questions/q1 의 answer 를 updateDoc 으로 써 넣는다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertFails(updateDoc(doc(db, 'questions/q1'), {
    answer: '내가 쓴 답변',
  }));
});

test('거부 - cust01 이 안내문 kb/k01 을 읽는다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertFails(getDoc(doc(db, 'kb/k01')));
});

test('거부 - cust01 이 안내문 kb/k01 의 text 를 바꾼다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertFails(updateDoc(doc(db, 'kb/k01'), {
    text: '배송 기간을 바꿉니다.',
  }));
});

test('허용 - cust01 이 자기 사용자 문서 users/cust01 을 읽는다', async () => {
  const db = testEnv.authenticatedContext('cust01').firestore();
  await assertSucceeds(getDoc(doc(db, 'users/cust01')));
});

test('거부 - cust02 가 남의 사용자 문서 users/cust01 을 읽는다', async () => {
  const db = testEnv.authenticatedContext('cust02').firestore();
  await assertFails(getDoc(doc(db, 'users/cust01')));
});

test('허용 - 새 손님 cust03 이 users/cust03 을 role customer 로 만든다', async () => {
  const db = testEnv.authenticatedContext('cust03').firestore();
  await assertSucceeds(setDoc(doc(db, 'users/cust03'), {
    name: '새 손님', role: 'customer',
  }));
});

test('거부 - 새 손님 cust03 이 users/cust03 을 role staff 로 만든다', async () => {
  const db = testEnv.authenticatedContext('cust03').firestore();
  await assertFails(setDoc(doc(db, 'users/cust03'), {
    name: '새 손님', role: 'staff',
  }));
});
