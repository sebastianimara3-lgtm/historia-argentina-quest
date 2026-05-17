import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Platform, Dimensions, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREGUNTAS } from './src/preguntas';

const { width: SW } = Dimensions.get('window');

// ─── Paleta Argentina ──────────────────────────────────────────────
const C = {
  azul:      '#003087',
  celeste:   '#74ACDF',
  celesClaro:'#D6E8F7',
  oro:       '#F6B40E',
  oroClar:   '#FEF3CD',
  verde:     '#1A6B1A',
  verdeClar: '#E0F0E0',
  rojo:      '#9B1C1C',
  rojoClar:  '#FCE8E8',
  bg:        '#F4F6FB',
  card:      '#FFFFFF',
  borde:     '#DDE3EE',
  texto:     '#1A1E2E',
  texto2:    '#5A6380',
  texto3:    '#9AA3BB',
};

const TOTAL = 20;
const MAX_LIVES = 3;
const PTS   = { 1: 10, 2: 20, 3: 35 };
const DLBL  = { 1: 'Fácil', 2: 'Medio', 3: 'Difícil' };
const ELBL  = {
  Colonial: 'Colonial', Independencia: 'Independencia',
  'Organización': 'Org. Nacional', 'Siglo XX': 'Siglo XX',
  Democracia: 'Democracia',
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(diff, era) {
  let pool = PREGUNTAS.filter(p =>
    (!era || p.era === era) && (!diff || p.dif === diff)
  );
  if (pool.length < TOTAL) pool = PREGUNTAS.filter(p => !era || p.era === era);
  if (pool.length < TOTAL) pool = [...PREGUNTAS];
  return shuffle(pool).slice(0, TOTAL);
}

// ─── Screens ──────────────────────────────────────────────────────
const SCREEN = { HOME: 'home', GAME: 'game', RESULT: 'result' };

export default function App() {
  const [screen, setScreen] = useState(SCREEN.HOME);
  const [playerName, setPlayerName] = useState('');
  const [diff, setDiff] = useState(1);
  const [era, setEra]   = useState('');
  const [ranking, setRanking] = useState([]);

  // game state
  const [queue,    setQueue]    = useState([]);
  const [qi,       setQi]       = useState(0);
  const [score,    setScore]    = useState(0);
  const [lives,    setLives]    = useState(MAX_LIVES);
  const [streak,   setStreak]   = useState(0);
  const [maxStreak,setMaxStreak]= useState(0);
  const [correct,  setCorrect]  = useState(0);
  const [answered, setAnswered] = useState(false);
  const [chosen,   setChosen]   = useState(null);
  const [startTime,setStartTime]= useState(null);
  const [elapsed,  setElapsed]  = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [shuffledOpts, setShuffledOpts] = useState([]);

  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const toastAnim  = useRef(new Animated.Value(0)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('haq_rank').then(v => {
      if (v) setRanking(JSON.parse(v));
    });
  }, []);

  // Timer
  useEffect(() => {
    if (screen === SCREEN.GAME) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, startTime]);

  const animateProgress = useCallback((idx) => {
    Animated.timing(progressAnim, {
      toValue: (idx + 1) / TOTAL,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [toastAnim]);

  const shakeCard = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  function startGame() {
    const q = buildQueue(diff, era);
    setQueue(q);
    setQi(0);
    setScore(0);
    setLives(MAX_LIVES);
    setStreak(0);
    setMaxStreak(0);
    setCorrect(0);
    setAnswered(false);
    setChosen(null);
    setElapsed(0);
    setStartTime(Date.now());
    setShuffledOpts(shuffle(q[0].ops));
    progressAnim.setValue(0);
    fadeAnim.setValue(1);
    setScreen(SCREEN.GAME);
  }

  function handleAnswer(opt) {
    if (answered) return;
    setAnswered(true);
    setChosen(opt);
    const q = queue[qi];
    const ok = opt === q.r;

    if (ok) {
      const newCorrect = correct + 1;
      const newStreak  = streak + 1;
      const newMaxStr  = Math.max(maxStreak, newStreak);
      const pts  = PTS[q.dif] || 10;
      const bonus = newStreak >= 3 ? Math.floor(pts * 0.5) : 0;
      const newScore = score + pts + bonus;
      setCorrect(newCorrect);
      setStreak(newStreak);
      setMaxStreak(newMaxStr);
      setScore(newScore);
      if (newStreak >= 3) showToast(`🔥 Racha x${newStreak}! +${bonus} bonus`);
    } else {
      setStreak(0);
      const newLives = lives - 1;
      setLives(newLives);
      shakeCard();
      if (newLives <= 0) {
        setTimeout(() => endGame(score, correct, maxStreak), 1400);
        return;
      }
    }

    if (qi + 1 >= TOTAL) {
      setTimeout(() => endGame(
        ok ? score + (PTS[q.dif]||10) + (streak+1>=3?Math.floor((PTS[q.dif]||10)*.5):0) : score,
        ok ? correct+1 : correct,
        ok ? Math.max(maxStreak, streak+1) : maxStreak
      ), 1400);
    }
  }

  function nextQuestion() {
    const nextIdx = qi + 1;
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setQi(nextIdx);
      setAnswered(false);
      setChosen(null);
      setShuffledOpts(shuffle(queue[nextIdx].ops));
      animateProgress(nextIdx);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  }

  async function endGame(finalScore, finalCorrect, finalMaxStreak) {
    const elapsedFinal = Math.floor((Date.now() - startTime) / 1000);
    const name = playerName.trim() || 'Jugador';
    const entry = {
      name, score: finalScore, correct: finalCorrect,
      maxStreak: finalMaxStreak, elapsed: elapsedFinal,
      date: new Date().toLocaleDateString('es-AR'),
    };
    const newRanking = [...ranking, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setRanking(newRanking);
    await AsyncStorage.setItem('haq_rank', JSON.stringify(newRanking));
    setElapsed(elapsedFinal);
    setScreen(SCREEN.RESULT);
  }

  // ─── RENDER ─────────────────────────────────────────────────────
  if (screen === SCREEN.HOME) return <HomeScreen {...{ playerName, setPlayerName, diff, setDiff, era, setEra, ranking, startGame }} />;
  if (screen === SCREEN.GAME) return (
    <GameScreen
      q={queue[qi]} qi={qi} score={score} lives={lives} elapsed={elapsed}
      answered={answered} chosen={chosen} shuffledOpts={shuffledOpts}
      fadeAnim={fadeAnim} toastAnim={toastAnim} shakeAnim={shakeAnim}
      progressAnim={progressAnim} toastMsg={toastMsg}
      handleAnswer={handleAnswer} nextQuestion={nextQuestion}
    />
  );
  if (screen === SCREEN.RESULT) return (
    <ResultScreen
      score={score} correct={correct} maxStreak={maxStreak} elapsed={elapsed}
      ranking={ranking} playerName={playerName.trim()||'Jugador'}
      startGame={startGame} goHome={() => setScreen(SCREEN.HOME)}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════════
function HomeScreen({ playerName, setPlayerName, diff, setDiff, era, setEra, ranking, startGame }) {
  const DIFFS = [
    { id: 1, icon: '🌱', label: 'Fácil',   desc: '10 pts c/u' },
    { id: 2, icon: '⚡', label: 'Medio',   desc: '20 pts c/u' },
    { id: 3, icon: '🔥', label: 'Difícil', desc: '35 pts c/u' },
    { id: 0, icon: '🎲', label: 'Mixto',   desc: 'Todo nivel' },
  ];
  const ERAS = [
    { id: '',              icon: '🗺️', label: 'Todas las épocas' },
    { id: 'Colonial',      icon: '⚓', label: 'Colonia' },
    { id: 'Independencia', icon: '🗡️', label: 'Independencia' },
    { id: 'Organización',  icon: '📜', label: 'Org. Nacional' },
    { id: 'Siglo XX',      icon: '🏭', label: 'Siglo XX' },
    { id: 'Democracia',    icon: '🗳️', label: 'Democracia' },
  ];

  const topScore = ranking[0];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />
      <View style={s.homeHeader}>
        <Text style={s.homeFlag}>🇦🇷</Text>
        <Text style={s.homeTitle}>Historia Argentina{'\n'}Quest</Text>
        <Text style={s.homeSub}>466 preguntas · Desafiá tu conocimiento</Text>
        {topScore && (
          <View style={s.homeBest}>
            <Text style={s.homeBestTxt}>🏆 Mejor: {topScore.name} — {topScore.score} pts</Text>
          </View>
        )}
      </View>

      <ScrollView style={s.homeScroll} contentContainerStyle={s.homeContent} showsVerticalScrollIndicator={false}>
        {/* Nombre */}
        <Text style={s.seclbl}>Tu nombre</Text>
        <TextInput
          style={s.nameInput}
          placeholder="Ingresá tu nombre..."
          placeholderTextColor={C.texto3}
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={20}
          returnKeyType="done"
        />

        {/* Dificultad */}
        <Text style={s.seclbl}>Dificultad</Text>
        <View style={s.diffGrid}>
          {DIFFS.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[s.diffBtn, diff === d.id && s.diffBtnOn]}
              onPress={() => setDiff(d.id)}
              activeOpacity={0.75}
            >
              <Text style={s.diffIcon}>{d.icon}</Text>
              <Text style={[s.diffLbl, diff === d.id && s.diffLblOn]}>{d.label}</Text>
              <Text style={s.diffDesc}>{d.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Época */}
        <Text style={s.seclbl}>Época (opcional)</Text>
        <View style={s.eraGrid}>
          {ERAS.map(e => (
            <TouchableOpacity
              key={e.id}
              style={[s.eraBtn, era === e.id && s.eraBtnOn]}
              onPress={() => setEra(e.id)}
              activeOpacity={0.75}
            >
              <Text style={s.eraIcon}>{e.icon}</Text>
              <Text style={[s.eraLbl, era === e.id && s.eraLblOn]} numberOfLines={1}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.goBtn} onPress={startGame} activeOpacity={0.85}>
          <Text style={s.goBtnTxt}>¡Comenzar!</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GAME SCREEN
// ═══════════════════════════════════════════════════════════════════
function GameScreen({
  q, qi, score, lives, elapsed, answered, chosen, shuffledOpts,
  fadeAnim, toastAnim, shakeAnim, progressAnim, toastMsg,
  handleAnswer, nextQuestion,
}) {
  if (!q) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  function optStyle(opt) {
    if (!answered) return s.opt;
    if (opt === q.r) return [s.opt, s.optOk];
    if (opt === chosen && opt !== q.r) return [s.opt, s.optNo];
    return [s.opt, s.optDim];
  }
  function optTxtStyle(opt) {
    if (!answered) return s.optTxt;
    if (opt === q.r) return [s.optTxt, { color: C.verde }];
    if (opt === chosen && opt !== q.r) return [s.optTxt, { color: C.rojo }];
    return [s.optTxt, { color: C.texto3 }];
  }

  const diffColors = { 1: C.verde, 2: '#B45309', 3: C.rojo };
  const diffBgs    = { 1: C.verdeClar, 2: C.oroClar, 3: C.rojoClar };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />

      {/* Header azul */}
      <View style={s.gameHeader}>
        <View style={s.gameHdrRow}>
          <Text style={s.gameScore}>⭐ {score} pts</Text>
          <Text style={s.gameTimer}>⏱ {elapsed}s</Text>
          <Text style={s.gameLives}>
            {'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, MAX_LIVES - lives))}
          </Text>
        </View>
        {/* Progress bar */}
        <View style={s.progBar}>
          <Animated.View style={[s.progFill, { width: progressWidth }]} />
        </View>
      </View>

      {/* Toast racha */}
      <Animated.View style={[s.toast, { opacity: toastAnim }]} pointerEvents="none">
        <Text style={s.toastTxt}>{toastMsg}</Text>
      </Animated.View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.gameBody} showsVerticalScrollIndicator={false}>
        {/* Meta */}
        <View style={s.qMeta}>
          <Text style={s.qNum}>{qi + 1}/{TOTAL}</Text>
          <View style={[s.badge, { backgroundColor: diffBgs[q.dif] }]}>
            <Text style={[s.badgeTxt, { color: diffColors[q.dif] }]}>{DLBL[q.dif]}</Text>
          </View>
          {q.era ? (
            <View style={[s.badge, { backgroundColor: C.celesClaro }]}>
              <Text style={[s.badgeTxt, { color: C.azul }]}>{ELBL[q.era] || q.era}</Text>
            </View>
          ) : null}
        </View>

        {/* Pregunta */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }}>
          <View style={s.qCard}>
            <Text style={s.qTxt}>{q.q}</Text>
          </View>

          {/* Pista */}
          <View style={s.hintBox}>
            <Text style={s.hintTxt}>💡 {q.pista}</Text>
          </View>

          {/* Opciones */}
          <View style={s.opts}>
            {shuffledOpts.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={optStyle(opt)}
                onPress={() => handleAnswer(opt)}
                disabled={answered}
                activeOpacity={0.75}
              >
                <View style={s.optInner}>
                  <View style={[s.optBullet, answered && opt === q.r && s.optBulletOk, answered && opt === chosen && opt !== q.r && s.optBulletNo]}>
                    <Text style={s.optBulletTxt}>{String.fromCharCode(65 + i)}</Text>
                  </View>
                  <Text style={optTxtStyle(opt)} numberOfLines={3}>{opt}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nota histórica post-respuesta */}
          {answered && (
            <View style={s.noteBox}>
              <Text style={s.noteIcon}>📖</Text>
              <Text style={s.noteTxt}>{q.nota}</Text>
            </View>
          )}

          {/* Botón siguiente */}
          {answered && qi + 1 < TOTAL && lives > 0 && (
            <TouchableOpacity style={s.nextBtn} onPress={nextQuestion} activeOpacity={0.85}>
              <Text style={s.nextBtnTxt}>Siguiente →</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RESULT SCREEN
// ═══════════════════════════════════════════════════════════════════
function ResultScreen({ score, correct, maxStreak, elapsed, ranking, playerName, startGame, goHome }) {
  const pct = correct / TOTAL;
  const emoji = pct < 0.3 ? '😅' : pct < 0.5 ? '📚' : pct < 0.7 ? '🎓' : pct < 0.9 ? '⭐' : '🏆';
  const title = pct < 0.3 ? '¡A repasar la historia!' : pct < 0.5 ? '¡Buen intento!' : pct < 0.7 ? '¡Muy bien!' : pct < 0.9 ? '¡Excelente!' : '¡Maestro de la Historia!';
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />
      <View style={s.resHeader}>
        <Text style={s.resEmoji}>{emoji}</Text>
        <Text style={s.resTitle}>{title}</Text>
        <Text style={s.resName}>{playerName}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.resBody} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={s.statsGrid}>
          {[
            { n: score, l: 'Puntos' },
            { n: `${correct}/${TOTAL}`, l: 'Correctas' },
            { n: maxStreak, l: 'Racha máx.' },
            { n: `${elapsed}s`, l: 'Tiempo' },
          ].map((st, i) => (
            <View key={i} style={s.statCard}>
              <Text style={s.statNum}>{st.n}</Text>
              <Text style={s.statLbl}>{st.l}</Text>
            </View>
          ))}
        </View>

        {/* Ranking */}
        <Text style={s.rankTitle}>🏅 Ranking</Text>
        {ranking.slice(0, 8).map((r, i) => {
          const isMe = r.name === playerName && r.score === score;
          return (
            <View key={i} style={[s.rankRow, isMe && s.rankRowMe]}>
              <Text style={s.rankPos}>{medals[i] || i + 1}</Text>
              <Text style={s.rankName} numberOfLines={1}>{r.name}</Text>
              <Text style={s.rankScore}>{r.score} pts</Text>
            </View>
          );
        })}

        {/* Botones */}
        <TouchableOpacity style={s.goBtn} onPress={startGame} activeOpacity={0.85}>
          <Text style={s.goBtnTxt}>Jugar de nuevo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secBtn} onPress={goHome} activeOpacity={0.85}>
          <Text style={s.secBtnTxt}>Cambiar configuración</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // HOME
  homeHeader: {
    backgroundColor: C.azul,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 24, paddingHorizontal: 24,
    alignItems: 'center',
  },
  homeFlag:  { fontSize: 56, marginBottom: 8 },
  homeTitle: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 30 },
  homeSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6, textAlign: 'center' },
  homeBest:  { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  homeBestTxt: { fontSize: 12, color: '#fff', fontWeight: '500' },

  homeScroll:   { flex: 1 },
  homeContent:  { padding: 20 },
  seclbl: { fontSize: 11, fontWeight: '700', color: C.texto2, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  nameInput: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.borde,
    padding: 14, fontSize: 15, color: C.texto, marginBottom: 20,
  },

  diffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  diffBtn: {
    width: (SW - 56) / 2, backgroundColor: C.card,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.borde,
    padding: 12, alignItems: 'center',
  },
  diffBtnOn: { borderColor: C.celeste, backgroundColor: C.celesClaro },
  diffIcon:  { fontSize: 24, marginBottom: 4 },
  diffLbl:   { fontSize: 13, fontWeight: '600', color: C.texto },
  diffLblOn: { color: C.azul },
  diffDesc:  { fontSize: 10, color: C.texto2, marginTop: 2 },

  eraGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  eraBtn: {
    width: (SW - 56) / 2, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 10, borderWidth: 1.5, borderColor: C.borde,
    padding: 10, gap: 6,
  },
  eraBtnOn: { borderColor: C.celeste, backgroundColor: C.celesClaro },
  eraIcon:  { fontSize: 16 },
  eraLbl:   { fontSize: 12, color: C.texto2, flex: 1 },
  eraLblOn: { color: C.azul, fontWeight: '600' },

  goBtn: {
    backgroundColor: C.azul, borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 10,
  },
  goBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // GAME
  gameHeader: {
    backgroundColor: C.azul,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  gameHdrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  gameScore:  { fontSize: 15, fontWeight: '700', color: '#fff' },
  gameTimer:  { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  gameLives:  { fontSize: 16, letterSpacing: 2 },
  progBar:    { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' },
  progFill:   { height: '100%', backgroundColor: C.celeste, borderRadius: 99 },

  toast: {
    position: 'absolute', top: Platform.OS === 'android' ? 100 : 112,
    alignSelf: 'center', zIndex: 99,
    backgroundColor: C.oro, borderRadius: 99,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  toastTxt: { fontSize: 13, fontWeight: '700', color: '#5a3a00' },

  gameBody: { padding: 16 },

  qMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  qNum:  { fontSize: 12, color: C.texto3, fontWeight: '500' },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  qCard: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.borde,
    padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  qTxt: { fontSize: 17, fontWeight: '600', color: C.texto, lineHeight: 26 },

  hintBox: {
    backgroundColor: '#EEF2F9', borderRadius: 10, padding: 10,
    marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start',
  },
  hintTxt: { fontSize: 13, color: C.texto2, lineHeight: 19, flex: 1 },

  opts: { gap: 10, marginBottom: 14 },
  opt: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1.5, borderColor: C.borde,
    padding: 0, overflow: 'hidden',
  },
  optOk:  { borderColor: C.verde, backgroundColor: C.verdeClar },
  optNo:  { borderColor: C.rojo,  backgroundColor: C.rojoClar },
  optDim: { borderColor: C.borde, backgroundColor: C.bg, opacity: 0.6 },
  optInner: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12 },
  optBullet: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.borde,
    alignItems: 'center', justifyContent: 'center',
  },
  optBulletOk: { backgroundColor: C.verde, borderColor: C.verde },
  optBulletNo: { backgroundColor: C.rojo,  borderColor: C.rojo },
  optBulletTxt: { fontSize: 12, fontWeight: '700', color: C.texto2 },
  optTxt: { fontSize: 14, color: C.texto, flex: 1, lineHeight: 20 },

  noteBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#F0F4FF',
    borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: C.celeste,
    marginBottom: 14,
  },
  noteIcon: { fontSize: 16 },
  noteTxt:  { fontSize: 13, color: C.texto2, lineHeight: 19, flex: 1 },

  nextBtn: {
    backgroundColor: C.azul, borderRadius: 12, padding: 15, alignItems: 'center',
  },
  nextBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // RESULT
  resHeader: {
    backgroundColor: C.azul,
    paddingTop: Platform.OS === 'android' ? 52 : 64,
    paddingBottom: 28, paddingHorizontal: 24,
    alignItems: 'center',
  },
  resEmoji: { fontSize: 64, marginBottom: 8 },
  resTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  resName:  { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  resBody: { padding: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24, marginTop: 4 },
  statCard: {
    width: (SW - 50) / 2, backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.borde, padding: 16, alignItems: 'center',
  },
  statNum: { fontSize: 28, fontWeight: '700', color: C.azul },
  statLbl: { fontSize: 11, color: C.texto2, marginTop: 4, fontWeight: '500' },

  rankTitle: { fontSize: 15, fontWeight: '700', color: C.texto, marginBottom: 12 },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 10, marginBottom: 6,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.borde,
  },
  rankRowMe: { backgroundColor: C.celesClaro, borderColor: C.celeste },
  rankPos:   { fontSize: 16, minWidth: 28 },
  rankName:  { fontSize: 13, fontWeight: '600', color: C.texto, flex: 1 },
  rankScore: { fontSize: 13, fontWeight: '700', color: C.azul },

  secBtn: {
    backgroundColor: C.card, borderRadius: 12, padding: 14, borderWidth: 1.5,
    borderColor: C.borde, alignItems: 'center',
  },
  secBtnTxt: { color: C.texto, fontSize: 14, fontWeight: '600' },
});
