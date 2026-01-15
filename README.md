# ⚔️ Combat Simulation

A turn-based card combat simulator with interactive statistical visualization. This is a pure client-side JavaScript implementation that runs entirely in the browser - no server required!

**[Live Demo](https://angrygrandma66.github.io/)**

## Features

- **Turn-based combat** between Protagonist and Antagonist
- **Card-based mechanics** with suits providing different effects
- **Advantage system** with cyclic relationships between suits
- **Reaction system** with resource management
- **Interactive web UI** for configuring and running simulations
- **Single and Batch modes** for detailed analysis or statistical aggregation
- **Async processing** to prevent UI freeze during large batch simulations
- **Input validation** with helpful error messages
- **Responsive design** with dark theme

## Usage

Simply open `index.html` in a modern web browser, or visit the [GitHub Pages deployment](https://angrygrandma66.github.io/).

### Running Locally

You can serve the files with any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

> **Note:** Due to ES6 module usage, opening `index.html` directly via `file://` protocol won't work. You need to serve the files via HTTP.

## Card System

### Notation

Cards are specified as `<value><suit>`:
- **s** = Spades (normal attack)
- **d** = Diamonds (increases reaction costs by +2)
- **c** = Crosses (+2 hit chance)
- **h** = Hearts (+2 flat damage)

Example deck: `2s 3s 4d 5h 6c 7s 8d 9h`

### Advantage Cycle

```
Spades → Crosses → Diamonds → Hearts → Spades
```

Advantage only matters when attack and defense values are equal (ties).

## Combat Rules

### Turn Structure

Each turn, a combatant chooses one action:
1. **Defend**: Gain +3 AC until next turn
2. **Attack**: Play a card and attempt to hit

### Hit Resolution

1. Roll d20 + hit bonus (+2 if using Crosses)
2. If roll > target AC: hit succeeds, defender may react
3. If roll ≤ target AC: miss, only counter-reactions possible

### Damage Calculation

- **Attack wins**: Defender takes Δd4 damage (+2 if Hearts)
- **Defense wins**: Attacker takes Δd4 damage
- **Tie**: Check advantage for 1d4 damage or block

### Reactions

- **Defense Reaction**: Play a card to defend
- **Counter Reaction**: Take damage but attack back immediately
- Cost: `danger` resources (+ 2 if attacked by Diamonds)

## Strategies

- **Random** (default): Random card selection with 20% defend chance
- **Conservative**: Save high-value cards for later, use lowest value cards first
- **Aggressive**: Use highest cards first for maximum damage

## Project Structure

```
AngryGrandma66.github.io/
├── index.html          # Main HTML file
├── js/
│   ├── models.js       # Data structures (Card, Deck, Combatant, etc.)
│   ├── rules.js        # Combat mechanics (dice, damage, advantage)
│   ├── strategy.js     # AI card selection strategies
│   ├── simulation.js   # Combat simulation engine
│   └── app.js          # UI controller and chart generation
└── README.md
```

## Technical Details

- **Pure JavaScript** - No build step required
- **ES6 Modules** - Clean code organization
- **Bootstrap 5** - Responsive dark theme UI
- **Plotly.js** - Interactive charts
- **Async Processing** - Optional non-blocking batch simulation

## Browser Compatibility

Works in all modern browsers that support ES6 modules:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## License

MIT

## Credits

Original Python/Dash implementation ported to client-side JavaScript.

