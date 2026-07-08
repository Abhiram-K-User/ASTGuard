export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');


export const VERDICTS = {
  Safe: {
    cls: 'verdict-safe',
    icon: '✅',
    color: '#10b981',
    description:
      'The structural patterns of these two submissions differ significantly. ' +
      'No evidence of plagiarism detected at the AST level.',
  },
  Suspicious: {
    cls: 'verdict-suspicious',
    icon: '⚠️',
    color: '#f59e0b',
    description:
      'The two submissions share a notable portion of structural patterns. ' +
      'Manual review is recommended to determine intent.',
  },
  Blatant: {
    cls: 'verdict-blatant',
    icon: '🚨',
    color: '#ef4444',
    description:
      'The structural AST signatures are nearly identical — strong evidence of ' +
      'plagiarism, even after variable renaming or literal substitution.',
  },
};

export const PLACEHOLDER_A = `def calculate_grade(score):
    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    else:
        grade = "F"
    return grade

def process_students(students):
    results = []
    for student in students:
        g = calculate_grade(student["marks"])
        results.append({"name": student["name"], "grade": g})
    return results`;

export const PLACEHOLDER_B = `def get_letter(pts):
    if pts >= 90:
        ltr = "A"
    elif pts >= 80:
        ltr = "B"
    elif pts >= 70:
        ltr = "C"
    else:
        ltr = "F"
    return ltr

def run_batch(data):
    out = []
    for entry in data:
        r = get_letter(entry["marks"])
        out.append({"name": entry["name"], "grade": r})
    return out`;

export const TEMPLATES = {
  python: {
    code_a: PLACEHOLDER_A,
    code_b: PLACEHOLDER_B
  },
  cpp: {
    code_a: `int calculateGrade(int score) {
    if (score >= 90) {
        return 1;
    } else if (score >= 80) {
        return 2;
    } else {
        return 3;
    }
}

void processStudents() {
    int scores[] = {95, 82, 60};
    for (int i = 0; i < 3; i++) {
        int g = calculateGrade(scores[i]);
    }
}`,
    code_b: `int getGrade(int pts) {
    if (pts >= 90) {
        return 1;
    }
    if (pts >= 80) {
        return 2;
    }
    return 3;
}

void analyzeData() {
    int marks[] = {95, 82, 60};
    for (int idx = 0; idx < 3; idx++) {
        int res = getGrade(marks[idx]);
    }
}`
  },
  java: {
    code_a: `public class Main {
    public int calculateGrade(int score) {
        if (score >= 90) {
            return 1;
        } else if (score >= 80) {
            return 2;
        } else {
            return 3;
        }
    }
}`,
    code_b: `public class Grader {
    public int getGrade(int pts) {
        if (pts >= 90) {
            return 1;
        }
        if (pts >= 80) {
            return 2;
        }
        return 3;
    }
}`
  },
  c: {
    code_a: `int calculate_grade(int score) {
    if (score >= 90) {
        return 1;
    } else if (score >= 80) {
        return 2;
    } else {
        return 3;
    }
}

int main() {
    int score = 85;
    int g = calculate_grade(score);
    return 0;
}`,
    code_b: `int get_grade(int pts) {
    if (pts >= 90) {
        return 1;
    }
    if (pts >= 80) {
        return 2;
    }
    return 3;
}

int main() {
    int val = 85;
    int res = get_grade(val);
    return 0;
}`
  }
};
