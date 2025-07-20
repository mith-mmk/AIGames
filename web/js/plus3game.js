
class Plus3Game {
    constructor() {
        this.questionElement = document.getElementById('question');
        this.answerElements = [
            document.getElementById('answer1'),
            document.getElementById('answer2'),
            document.getElementById('answer3'),
            document.getElementById('answer4'),
        ];
        this.messageElement = document.getElementById('message');
        this.scoreElement = document.getElementById('score');
        this.timerElement = document.getElementById('timer');
        this.startButton = document.getElementById('start-button');
        this.checkButton = document.getElementById('check-button');

        this.questions = [];
        this.currentQuestionIndex = 0;
        this.startTime = 0;
        this.timerInterval = null;

        this.startButton.addEventListener('click', () => this.start());
        this.checkButton.addEventListener('click', () => this.checkAnswer());
        this.answerElements.forEach(input => {
            input.addEventListener('input', (event) => {
                if (event.target.value.length > 1) {
                    event.target.value = event.target.value.slice(0, 1);
                }
            });
        });
    }

    init() {
        this.questions = [];
        for (let i = 0; i < 10; i++) {
            const question = [];
            for (let j = 0; j < 4; j++) {
                question.push(Math.floor(Math.random() * 10));
            }
            this.questions.push(question);
        }
        this.currentQuestionIndex = 0;
        this.scoreElement.textContent = '';
        this.messageElement.textContent = '';
        this.clearAnswers();
    }

    start() {
        this.init();
        this.displayQuestion();
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.timerElement.textContent = `Time: ${elapsedTime}s`;
        }, 1000);
        this.startButton.style.display = 'none';
        this.checkButton.style.display = 'inline-block';
        this.answerElements.forEach(input => input.disabled = false);
    }

    displayQuestion() {
        if (this.currentQuestionIndex < this.questions.length) {
            this.questionElement.textContent = this.questions[this.currentQuestionIndex].join(' ');
        }
    }

    checkAnswer() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const userAnswers = this.answerElements.map(input => input.value);

        if (userAnswers.some(answer => answer === '')) {
            this.messageElement.textContent = 'すべてのこたえをいれてください。';
            return;
        }

        const correctAnswers = currentQuestion.map(num => (num + 3) % 10);
        const isCorrect = userAnswers.every((answer, index) => parseInt(answer, 10) === correctAnswers[index]);

        if (isCorrect) {
            this.currentQuestionIndex++;
            this.messageElement.textContent = 'せいかい！';
            this.clearAnswers();
            if (this.currentQuestionIndex < this.questions.length) {
                this.displayQuestion();
            } else {
                this.endGame();
            }
        } else {
            this.messageElement.textContent = 'まちがい。もういちどためしてください。';
        }
    }

    clearAnswers() {
        this.answerElements.forEach(input => input.value = '');
        if (this.answerElements.length > 0) {
            this.answerElements[0].focus();
        }
    }

    endGame() {
        clearInterval(this.timerInterval);
        const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
        this.timerElement.textContent = `Total Time: ${elapsedTime}s`;
        this.scoreElement.textContent = `Your Score: ${Math.max(0, 100 - elapsedTime)} Points`;
        this.questionElement.textContent = 'ゲームクリア！';
        this.startButton.textContent = 'もういちどプレイ';
        this.startButton.style.display = 'inline-block';
        this.checkButton.style.display = 'none';
        this.answerElements.forEach(input => input.disabled = true);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Plus3Game();
});
