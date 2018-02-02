var com = com || {};
com.lumpofcode = com.lumpofcode || {};


/**
 * @public
 * kmeans module
 * 
 *   cluster(model, k, converged = assignmentsConverged)
 *   distance(p, q),
 *   distanceSquared(p, q),
 *   centroidsConverged(delta)
 *   assignmentsConverged(model, newModel)
 */
com.lumpofcode.kmeans = (function() {

    /**
     * @public
     * Calculate the squared distance between two vectors.
     *
     * @param [number] p vector with same dimension as q
     * @param [number] q vector with same dimension as p
     * @return number the distance between p and q squared
     */
    function distanceSquared(p, q) {
        const d = p.length; // dimension of vectors

        if(d !== q.length) throw Error("p and q vectors must be the same length")

        let sum = 0;
        for(let i = 0; i < d; i += 1) {
            sum += (p[i] - q[i])**2
        }
        return sum;
    }

    /**
     * @public
     * Calculate the distance between two vectors of the same dimension.
     *
     * @param [number] p vector of same dimension as q
     * @param [number] q vector of same dimension as p
     * @return the distance between vectors p and q
     */
    function distance(p, q) {
        return Math.sqrt(distanceSquared(p, q));
    }

    /**
     * @private
     * find the closest centroid for the given observation and return it's index.
     *
     * @param [[number]] centroids - array of k vectors with same dimension as observations.
     *                               these are the center of the k clusters
     * @param [[number]] observation - array of n vectors with same dimension as centroids.
     *                                 these are the observations to be clustered.
     * @return number the index of the closest centroid in centroids
     */
    function findClosestCentroid(centroids, observation) {
        const k = centroids.length; // number of clusters/centroids

        let centroid = 0;
        let minDistance = distance(centroids[0], observation);
        for(let i = 1; i < k; i += 1) {
            const dist = distance(centroids[i], observation);
            if(dist < minDistance) {
                centroid = i;
                minDistance = dist;
            }
        }
        return centroid;
    }

    /**
     * @private
     * Calculate the centroid for the given observations.
     *
     * @param [[number]] observations - list of observation vectors
     * @return [number] centroid for given observations (vector of same dimension as observations)
     */
    function calculateCentroid(observations) {
        const n = observations.length;      // number of observations
        const d = observations[0].length;   // dimension of vectors

        // create zero vector of same dimension as observation
        let sum = [];
        for(let i = 0; i < d; i += 1) {
            sum.push(0.0);
        }

        // add each observation to the sum vector
        for(let i = 0; i < n; i += 1) {
            // add the observation to the sum vector, element by element
            for(let j = 0; j < d; j += 1) {
                sum[j] += observations[i][j];
            }
        }

        // divide each element of the sum by the number of observations
        for(let j = 0; j < d; j += 1) {
            sum[j] /= n;
        }

        return sum;
    }

    /**
     * @private
     * calculate the cluster assignments for the observations, given the centroids.
     *
     * @param [[number]] centroids - list of vectors with same dimension as observations
     * @param [[number]] observations - list of vectors with same dimension as centroids
     * @return [number] list of indices into centroids; one per observation.
     */
    function assignClusters(centroids, observations) {
        const n = observations.length;  // number of observations

        const assignments = [];
        for(let i = 0; i < n; i += 1) {
            assignments.push(findClosestCentroid(centroids, observations[i]));
        }

        return assignments; // centroid index for each observation
    }

    /**
     * @private
     * calculate one step of the k-means algorithm;
     * - assign each observation to the nearest centroid to create clusters
     * - calculate a new centroid for each cluster given the observations in the cluster.
     *
     * @param [[number]] centroids - list of vectors with same dimension as observations
     * @param [[number]] observations - list of vectors with same dimension as centroids
     * @return a new model with observations, centroids and assignments
     */
    function kmeansStep(centroids, observations) {
        const k = centroids.length; // number of clusters/centroids

        // assign each observation to the nearest centroid to create clusters
        const assignments = assignClusters(centroids, observations); // array of cluster indices that correspond observations

        // calculate a new centroid for each cluster given the observations in the cluster
        const newCentroids = [];
        for(let i = 0; i < k; i += 1) {
            // get the observations for this cluster/centroid
            const clusteredObservations = observations.filter((v, j) => assignments[j] === i);

            // calculate a new centroid for the observations
            newCentroids.push(calculateCentroid(clusteredObservations));
        }
        return {'observations': observations, 'centroids': newCentroids, 'assignments': assignments }
    }

    /**
     * @public
     * Run k-means on the given model until each centroid converges to with the given delta
     * The initial model is NOT modified by the algorithm, rather a new model is returned.
     * 
     * @param {*} model - object with 
     *                    observations: array, length n, of data points; each datapoint is 
     *                                  itself an array of numbers (a vector).
     *                                  The length each datapoint (d) vector should be the same.  
     *                    centroids: array of data points.
     *                               The length of the centroids array indicates the number of
     *                               of desired clusters (k).
     *                               each datapoint is array (vector) of numbers 
     *                               with same dimension as the datapoints in observations. 
     *                    assignments: array of integers, one per observation, 
     *                                 with values 0..centroids.length - 1
     * @param number delta - the maximum difference between each centroid in consecutive runs for convergence
     * @return {*} - result with 
     *               model: model, as described above, with updated centroids and assignments, 
     *               iterations: number of iterations, 
     *               durationMs: elapsed time in milliseconds
     */
    function kmeans(model, maximumIterations = 200, converged = assignmentsConverged) {
        const start = new Date();

        // calculate new centroids and cluster assignments
        let newModel = kmeansStep(model.centroids, model.observations);

        // continue until centroids do not change (within given delta)
        let i = 0;
        while((i < maximumIterations) && !converged(model, newModel)) {
            model = newModel;   // new model is our model now
            // console.log(model);

            // calculate new centroids and cluster assignments
            newModel = kmeansStep(model.centroids, model.observations);
            i += 1;
        }

        // console.log(newModel);
        const finish = new Date();
        return {'model': newModel, 'iterations': i, 'durationMs': (finish.getTime() - start.getTime())};
    }

    /**
     * @public
     * return a function that determines convergence based the centroids.
     * If two consecutive sets of centroids remain within a given delta,
     * then the algorithm is converged.
     * 
     * @param number delta, the maximum difference between each centroid in consecutive runs for convergence
     * @return function
     */
    function centroidsConverged(delta) {
        /**
         * determine if two consecutive set of centroids are converged given a maximum delta.
         *
         * @param [[number]] centroids - list of vectors with same dimension as observations
         * @param [[number]] newCentroids - list of vectors with same dimension as observations
         * @param number delta - the maximum difference between each centroid in consecutive runs for convergence
         */
        return function(model, newModel) {
            const centroids = model.centroids;
            const newCentroids = newModel.centroids;
    
            const k = centroids.length; // number of clusters/centroids
            for(let i = 0; i < k; i += 1) {
                if(distance(centroids[i], newCentroids[i]) > delta) {
                    return false;
                }
            }
    
            return true;
        }
    }

    /**
     * @public
     * determine if two consecutive set of clusters are converged;
     * the clusters are converged if the cluster assignments are the same.
     *
     * @param {*} model - object with observations, centroids, assignments
     * @param {*} newModel - object with observations, centroids, assignments
     * @param number delta - the maximum difference between each centroid in consecutive runs for convergence
     */
    function assignmentsConverged(model, newModel) {
        function arraysEqual(a, b) {
            if (a === b) return true;
            if (a === undefined || b === undefined) return false;
            if (a === null || b === null) return false;
            if (a.length !== b.length) return false;
          
            // If you don't care about the order of the elements inside
            // the array, you should sort both arrays here.
          
            for (var i = 0; i < a.length; ++i) {
              if (a[i] !== b[i]) return false;
            }
            return true;
          }
          
        return arraysEqual(model.assignments, newModel.assignments);
    }
    
    //
    // return public methods
    //
    return {
        'cluster': kmeans, 
        'distance': distance,
        'distanceSquared': distanceSquared,
        'centroidsConverged': centroidsConverged,
        'assignmentsConverged': assignmentsConverged
    };
})();
