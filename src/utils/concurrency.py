from concurrent.futures import ThreadPoolExecutor


def run_parallel(func, items, workers=20):

    with ThreadPoolExecutor(workers) as executor:

        results = list(executor.map(func, items))

    return results