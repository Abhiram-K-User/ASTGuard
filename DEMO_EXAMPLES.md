### B-1 · Grade Calculator — Variable Renaming Only

**Code A**
```python
def calculate_grade(score):
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
        name = student["name"]
        marks = student["marks"]
        g = calculate_grade(marks)
        results.append({"name": name, "grade": g})
    return results

students = [
    {"name": "Alice", "marks": 92},
    {"name": "Bob",   "marks": 78},
    {"name": "Carol", "marks": 55},
]
output = process_students(students)
for item in output:
    print(item["name"], "->", item["grade"])
```

**Code B** *(only identifiers changed — expected ~100 %)*
```python
def get_letter(pts):
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
        nm = entry["name"]
        sc = entry["marks"]
        r = get_letter(sc)
        out.append({"name": nm, "grade": r})
    return out

pupils = [
    {"name": "X", "marks": 92},
    {"name": "Y", "marks": 78},
    {"name": "Z", "marks": 55},
]
final = run_batch(pupils)
for rec in final:
    print(rec["name"], "->", rec["grade"])
```

---

### B-2 · Fibonacci — Renamed + Reordered Assignments

**Code A**
```python
def fibonacci(n):
    if n <= 0:
        return []
    if n == 1:
        return [0]
    sequence = [0, 1]
    for i in range(2, n):
        next_val = sequence[i - 1] + sequence[i - 2]
        sequence.append(next_val)
    return sequence

def print_fibonacci(count):
    result = fibonacci(count)
    for idx in range(len(result)):
        print(idx, "->", result[idx])

print_fibonacci(10)
```

**Code B** 
```python
def fib_series(limit):
    if limit <= 0:
        return []
    if limit == 1:
        return [0]
    series = [0, 1]
    for k in range(2, limit):
        nxt = series[k - 1] + series[k - 2]
        series.append(nxt)
    return series

def display_fib(total):
    nums = fib_series(total)
    for pos in range(len(nums)):
        print(pos, "->", nums[pos])

display_fib(10)
```

---

### B-3 · Stack Implementation — Renamed Class and Methods

**Code A**
```python
class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if self.is_empty():
            return None
        return self.items.pop()

    def peek(self):
        if self.is_empty():
            return None
        return self.items[-1]

    def is_empty(self):
        return len(self.items) == 0

    def size(self):
        return len(self.items)

stack = Stack()
for val in [10, 20, 30]:
    stack.push(val)
while not stack.is_empty():
    print(stack.pop())
```

**Code B** 
```python
class Pile:
    def __init__(self):
        self.data = []

    def add(self, element):
        self.data.append(element)

    def remove(self):
        if self.empty():
            return None
        return self.data.pop()

    def top(self):
        if self.empty():
            return None
        return self.data[-1]

    def empty(self):
        return len(self.data) == 0

    def count(self):
        return len(self.data)

pile = Pile()
for num in [10, 20, 30]:
    pile.add(num)
while not pile.empty():
    print(pile.remove())
```

---

##  SUSPICIOUS Pairs

### S-1 · Grade Calculator — Guard-Clause vs if-elif

**Code A** 
```python
def calculate_grade(score):
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
        name = student["name"]
        marks = student["marks"]
        g = calculate_grade(marks)
        results.append({"name": name, "grade": g})
    return results

students = [
    {"name": "Alice", "marks": 92},
    {"name": "Bob",   "marks": 78},
    {"name": "Carol", "marks": 55},
]
output = process_students(students)
for item in output:
    print(item["name"], "->", item["grade"])
```

**Code B** 
```python
def calculate_grade(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"

def process_students(students):
    return [
        {"name": s["name"], "grade": calculate_grade(s["marks"])}
        for s in students
    ]

students = [
    {"name": "Alice", "marks": 92},
    {"name": "Bob",   "marks": 78},
    {"name": "Carol", "marks": 55},
]
results = process_students(students)
for item in results:
    print(item["name"], "->", item["grade"])
```

---

### S-2 · Fibonacci — Iterative vs While-loop Variant

**Code A** *(for-loop)*
```python
def fibonacci(n):
    if n <= 0:
        return []
    if n == 1:
        return [0]
    sequence = [0, 1]
    for i in range(2, n):
        next_val = sequence[i - 1] + sequence[i - 2]
        sequence.append(next_val)
    return sequence

def print_fibonacci(count):
    result = fibonacci(count)
    for idx in range(len(result)):
        print(idx, "->", result[idx])

print_fibonacci(10)
```

**Code B** 
```python
def fibonacci(n):
    if n <= 0:
        return []
    if n == 1:
        return [0]
    sequence = [0, 1]
    i = 2
    while i < n:
        next_val = sequence[i - 1] + sequence[i - 2]
        sequence.append(next_val)
        i += 1
    return sequence

def print_fibonacci(count):
    result = fibonacci(count)
    idx = 0
    while idx < len(result):
        print(idx, "->", result[idx])
        idx += 1

print_fibonacci(10)
```

---

### S-3 · Linear Search — Explicit Loop vs List Comprehension Filter

**Code A** 
```python
def find_passing(scores):
    passing = []
    for score in scores:
        if score >= 50:
            passing.append(score)
    return passing

def find_failing(scores):
    failing = []
    for score in scores:
        if score < 50:
            failing.append(score)
    return failing

def summarise(scores):
    p = find_passing(scores)
    f = find_failing(scores)
    return {"passing": p, "failing": f, "total": len(scores)}

data = [72, 45, 88, 33, 61, 49, 95]
report = summarise(data)
for key in report:
    print(key, ":", report[key])
```

**Code B** 
```python
def find_passing(scores):
    return [s for s in scores if s >= 50]

def find_failing(scores):
    return [s for s in scores if s < 50]

def summarise(scores):
    p = find_passing(scores)
    f = find_failing(scores)
    return {"passing": p, "failing": f, "total": len(scores)}

data = [72, 45, 88, 33, 61, 49, 95]
report = summarise(data)
for key in report:
    print(key, ":", report[key])
```

---


### F-1 · Grade Calculator vs Binary Search + Bubble Sort

**Code A** 
```python
def calculate_grade(score):
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
        name = student["name"]
        marks = student["marks"]
        g = calculate_grade(marks)
        results.append({"name": name, "grade": g})
    return results

students = [
    {"name": "Alice", "marks": 92},
    {"name": "Bob",   "marks": 78},
    {"name": "Carol", "marks": 55},
]
output = process_students(students)
for item in output:
    print(item["name"], "->", item["grade"])
```

**Code B** 
```python
def binary_search(arr, target):
    left = 0
    right = len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

data = [64, 34, 25, 12, 22, 11, 90]
sorted_data = bubble_sort(data)
idx = binary_search(sorted_data, 25)
print("Found 25 at index:", idx)
```

---

### F-2 · Fibonacci vs Matrix Transposition

**Code A** 
```python
def fibonacci(n):
    if n <= 0:
        return []
    if n == 1:
        return [0]
    sequence = [0, 1]
    for i in range(2, n):
        next_val = sequence[i - 1] + sequence[i - 2]
        sequence.append(next_val)
    return sequence

def print_fibonacci(count):
    result = fibonacci(count)
    for idx in range(len(result)):
        print(idx, "->", result[idx])

print_fibonacci(10)
```

**Code B** 
```python
def transpose(matrix):
    rows = len(matrix)
    cols = len(matrix[0])
    result = []
    for j in range(cols):
        new_row = []
        for i in range(rows):
            new_row.append(matrix[i][j])
        result.append(new_row)
    return result

def print_matrix(matrix):
    for row in matrix:
        print(row)

m = [
    [1, 2, 3],
    [4, 5, 6],
]
print("Original:")
print_matrix(m)
print("Transposed:")
print_matrix(transpose(m))
```

---

### F-3 · Stack vs Caesar Cipher

**Code A** 
```python
class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if self.is_empty():
            return None
        return self.items.pop()

    def peek(self):
        if self.is_empty():
            return None
        return self.items[-1]

    def is_empty(self):
        return len(self.items) == 0

    def size(self):
        return len(self.items)

stack = Stack()
for val in [10, 20, 30]:
    stack.push(val)
while not stack.is_empty():
    print(stack.pop())
```

**Code B** 
```python
def encrypt(text, shift):
    result = ""
    for ch in text:
        if ch.isalpha():
            base = ord("A") if ch.isupper() else ord("a")
            result += chr((ord(ch) - base + shift) % 26 + base)
        else:
            result += ch
    return result

def decrypt(text, shift):
    return encrypt(text, 26 - shift)

def run_cipher(message, shift):
    enc = encrypt(message, shift)
    dec = decrypt(enc, shift)
    print("Original :", message)
    print("Encrypted:", enc)
    print("Decrypted:", dec)

run_cipher("Hello, World!", 3)
```

