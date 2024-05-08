import csv
from statistics import mean
#import matplotlib.pyplot as plt

# Read the timer data from timer.csv
rids = []
times = []
with open('timer.csv', 'r') as file:
    reader = csv.reader(file)
    for row in reader:
        rids.append(int(row[0]))
        times.append(int(row[1]))

print(len(times))

# # Plot the data
# plt.figure(figsize=(10, 6))
# plt.plot(rids, times, marker='o', linestyle='-', color='b')
# plt.title('Timer Data')
# plt.xlabel('Rid')
# plt.ylabel('Time taken (milliseconds)')
# plt.grid(True)
# plt.tight_layout()

# # Save the plot as timer_plot.png
# plt.savefig('timer_plot.png')

# # Show the plot
# plt.show()
