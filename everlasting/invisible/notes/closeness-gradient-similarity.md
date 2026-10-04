# 不同任务的 closeness 与其梯度余弦相似度的关系

> 来自 https://arxiv.org/abs/2604.09258

[TOC]

# 命题

## 定理 1

设 $\theta$ 是满足

$$
\nabla \mathcal{L}_{\mathrm{train}}(\theta)
=
\frac{1}{K}\sum_{k=1}^{K}\nabla \mathcal{L}_k(\theta)
=
\mathbf{0}
$$

的收敛参数。令

$$
\mathcal{S}_k
=
\left\{
\vartheta
\;\middle|\;
\exists \epsilon>0,\ \forall \vartheta'\in B_\epsilon(\vartheta),\
\mathcal{L}_k(\vartheta)\leq \mathcal{L}_k(\vartheta')
\right\}
$$

表示任务 $k$ 的局部最小值点集合，并令

$$
\theta_k^*
=
\underset{\vartheta\in\mathcal{S}_k}{\arg\min}
\|\vartheta-\theta\|_2.
$$

进一步定义

$$
\lambda_{\min}
=
\min_k\ 
\inf_{\xi\in[0,\theta_k^*]}
\left(
\frac{(\theta-\theta_k^*)^\top}
{\|\theta-\theta_k^*\|_2}
\nabla^2\mathcal{L}_k(\xi)
\frac{\theta-\theta_k^*}
{\|\theta-\theta_k^*\|_2}
\right)
>0,
$$

以及

$$
G=\sup_k\|\nabla\mathcal{L}_k(\theta)\|_2.
$$

那么，各任务最小值点之间的 closeness 满足如下界：

$$
\frac{1}{K}
\sum_{k=1}^{K}
\|\theta-\theta_k^*\|_2^2
\leq
\frac{1}{K\lambda_{\min}^2}
\sum_{i\neq j}
\left(
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
\right)
\leq
\frac{G^2}{K\lambda_{\min}^2}
\sum_{i\neq j}
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right).
$$

也就是说，不同任务的梯度方向越相似，各任务局部最小值点与参数 $\theta$ 之间的距离就越小。

> 梯度方向的余弦相似度是 closeness 的上界。

# 命题的证明

## 定理 1 的证明

将中值定理应用于向量值函数 $\vartheta\mapsto\nabla\mathcal{L}_k(\vartheta)$，则在线段 $\theta_k^*$ 与 $\theta$ 之间存在一点 $\xi_k$，使得

$$
\nabla\mathcal{L}_k(\theta)
-
\nabla\mathcal{L}_k(\theta_k^*)
=
\nabla^2\mathcal{L}_k(\xi_k)
(\theta-\theta_k^*).
$$

由于 $\theta_k^*$ 是一个最小值点，代入 $\nabla\mathcal{L}_k(\theta_k^*)=\mathbf{0}$ 并取范数，可得

$$
\|\nabla\mathcal{L}_k(\theta)\|_2
=
\left\|
\nabla^2\mathcal{L}_k(\xi_k)
(\theta-\theta_k^*)
\right\|_2.
$$

由定理的假设，沿位移向量方向，Hessian 的最小特征值有一个大于 $0$ 的下界 $\lambda$。这意味着

$$
\left\|
\nabla^2\mathcal{L}_k(\xi_k)
(\theta-\theta_k^*)
\right\|_2
\geq
\lambda
\|\theta-\theta_k^*\|_2.
$$

整理这一不等式，可以得到 closeness 的上界：

$$
\|\theta-\theta_k^*\|_2
\leq
\frac{1}{\lambda}
\|\nabla\mathcal{L}_k(\theta)\|_2.
$$

对两边平方，并在全部 $K$ 个任务上取平均，可得：

$$
\frac{1}{K}
\sum_{k=1}^{K}
\|\theta-\theta_k^*\|_2^2
\leq
\frac{1}{K\lambda^2}
\sum_{k=1}^{K}
\|\nabla\mathcal{L}_k(\theta)\|_2^2.
\tag{1}
$$

由于 $\theta$ 是总损失函数收敛后的参数，它满足驻点条件：

$$
\sum_{k=1}^{K}\nabla\mathcal{L}_k(\theta)=\mathbf{0}.
$$

该和式的平方范数等于零：

$$
\left\|
\sum_{k=1}^{K}\nabla\mathcal{L}_k(\theta)
\right\|_2^2
=
\sum_{k=1}^{K}
\|\nabla\mathcal{L}_k(\theta)\|_2^2
+
\sum_{i\neq j}
\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
=
0.
$$

通过移项，可以将梯度范数平方和与跨任务内积的负和联系起来：

$$
\sum_{k=1}^{K}
\|\nabla\mathcal{L}_k(\theta)\|_2^2
=
\sum_{i\neq j}
\left(
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
\right).
$$

将上式代入 (1)，即可得到定理中的第一个不等式：

$$
\frac{1}{K}
\sum_{k=1}^{K}
\|\theta-\theta_k^*\|_2^2
\leq
\frac{1}{K\lambda^2}
\sum_{i\neq j}
\left(
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
\right).
\tag{2}
$$

对于内积，可以利用梯度范数上界

$$
G=\sup_k\|\nabla\mathcal{L}_k(\theta)\|_2
$$

来 bound 一下。首先有：

$$
\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
=
\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right).
$$

注意到，因为 $\|\nabla\mathcal{L}_k(\theta)\|_2\leq G$ 且 $\operatorname{CosSim}(\cdot,\cdot)\leq 1$，对于任意 $i,j$，以下项均为非负：

$$
\begin{aligned}
&
\left(
G^2
-
\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\right)
\\
&\qquad\cdot
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right)
\geq 0,
\end{aligned}
$$

将这一非负项加到负内积上，可以直接得到如下界：

$$
\begin{aligned}
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
={}&
-\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\\
\leq{}&
-\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\\
&+
\left(
G^2
-
\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\right)
\\
&\qquad\cdot
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right)
\\
={}&
G^2
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right)
\\
&-
\|\nabla\mathcal{L}_i(\theta)\|_2
\|\nabla\mathcal{L}_j(\theta)\|_2
\\
\leq{}&
G^2
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right).
\end{aligned}
$$

对所有 $i\neq j$ 求和，可得：

$$
\sum_{i\neq j}
\left(
-\nabla\mathcal{L}_i(\theta)^\top
\nabla\mathcal{L}_j(\theta)
\right)
\leq
G^2
\sum_{i\neq j}
\left(
1-
\operatorname{CosSim}
\left(
\nabla\mathcal{L}_i(\theta),
\nabla\mathcal{L}_j(\theta)
\right)
\right).
$$

将其代入 (2)，就完成了定理的证明。

> 封面来自 https://osu.ppy.sh/beatmapsets/2027735#osu/4225364 Tokyo.MeltiMelt - the Beautiful Cure feat. nayuta
