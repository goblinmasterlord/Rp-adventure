"""Flask API routes for the Infinite Adventure."""

from flask import Flask, render_template, request, jsonify, session
from ..core.engine import GameEngine
from ..models.session import GameSession
import os


def create_app(api_key: str = None) -> Flask:
    """Create and configure the Flask application."""

    app = Flask(
        __name__,
        template_folder='../../templates',
        static_folder='../../static'
    )

    app.secret_key = os.urandom(24)

    # Initialize game engine
    engine = GameEngine(api_key)

    # In-memory session storage (use Redis/DB for production)
    game_sessions: dict[str, GameSession] = {}

    @app.route('/')
    def index():
        """Serve the main game interface."""
        return render_template('index.html')

    @app.route('/api/new-game', methods=['POST'])
    def new_game():
        """Start a new game session."""
        data = request.get_json() or {}
        player_name = data.get('player_name', 'Wanderer')

        try:
            game_session, opening_text = engine.new_game(player_name)
            game_sessions[game_session.session_id] = game_session

            return jsonify({
                'success': True,
                'session_id': game_session.session_id,
                'narrative': opening_text,
                'state': engine.get_game_state(game_session)
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @app.route('/api/action', methods=['POST'])
    def process_action():
        """Process a player action."""
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        session_id = data.get('session_id')
        action = data.get('action', '').strip()

        if not session_id or session_id not in game_sessions:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired session'
            }), 400

        if not action:
            return jsonify({
                'success': False,
                'error': 'No action provided'
            }), 400

        game_session = game_sessions[session_id]

        try:
            response, game_ended = engine.process_turn(game_session, action)

            return jsonify({
                'success': True,
                'narrative': response.narrative_text,
                'state': engine.get_game_state(game_session),
                'game_ended': game_ended,
                'clue_found': response.clue_found,
                'clue_description': response.clue_description,
                'item_gained': response.item_gained,
                'item_lost': response.item_lost,
                'atmospheric_hint': response.atmospheric_hint
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @app.route('/api/state/<session_id>', methods=['GET'])
    def get_state(session_id: str):
        """Get current game state."""
        if session_id not in game_sessions:
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404

        game_session = game_sessions[session_id]
        return jsonify({
            'success': True,
            'state': engine.get_game_state(game_session)
        })

    return app
