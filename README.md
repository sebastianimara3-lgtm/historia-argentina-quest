# 🇦🇷 Historia Argentina Quest

Juego de preguntas sobre Historia Argentina para Android. **466 preguntas** hardcodeadas, sin IA ni conexión a internet.

## Características

- 466 preguntas organizadas por época: Colonial, Independencia, Organización Nacional, Siglo XX, Democracia
- 3 niveles de dificultad (Fácil / Medio / Difícil / Mixto)
- Sistema de vidas (3 ❤️) y racha con bonus de puntos
- Pista antes de responder, nota histórica después
- Ranking persistente con los mejores 10 puntajes
- Funciona 100% offline

## Cómo descargar el APK

1. Ir a la pestaña **[Releases](../../releases)** de este repositorio
2. Descargar el archivo `.apk`
3. En el Android: **Ajustes → Seguridad → Fuentes desconocidas** (activar)
4. Abrir el `.apk` descargado e instalar

## Cómo compilar desde el código

```bash
# Instalar dependencias
npm install

# Correr en modo desarrollo
npm start

# Para compilar el APK, hacer push a main y GitHub Actions lo compila automáticamente
```

## Estructura del proyecto

```
historia-quest/
├── App.jsx              # Componente principal del juego
├── src/
│   └── preguntas.js     # Las 466 preguntas hardcodeadas
├── app.json             # Configuración Expo
├── package.json
└── .github/
    └── workflows/
        └── build-android.yml   # Compilación automática del APK
```
