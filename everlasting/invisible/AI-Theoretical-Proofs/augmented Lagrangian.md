# Augmented Lagrangian 的设计逻辑

我们考虑 machine unlearning 中的一个约束问题：提高 forget set 上的 loss，同时将 remote retain set 上的 loss 保持在原值。模型参数为 $\theta\in\mathbb R^d$，$d$ 是参数个数，$\theta_0$ 是原始模型参数；$\mathcal L_f(\theta)$ 和 $\mathcal L_r^{\mathrm{rem}}(\theta)$ 分别是待遗忘样本与关联较弱的保留样本上的平均 loss. 我们希望求解

$$
\min\limits_\theta-\mathcal L_f(\theta)
\quad\text{subject to}\quad
\mathcal L_r^{\mathrm{rem}}(\theta)
=\mathcal L_r^{\mathrm{rem}}(\theta_0).
$$

这里“带约束的最优化”是指：只在满足等式的参数中，寻找目标 $-\mathcal L_f$ 尽可能小的参数。以下先解释 augmented Lagrangian 如何处理这个问题，再在明确的凸性假设下推导乘子步长的依据。这些凸性假设用于解释标准方法，并不是上述神经网络问题自带的性质。

## 从约束到线性项与平方项

我们可以先尝试平方惩罚：

$$
-\mathcal L_f(\theta)
+\frac\mu2\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right)^2,
\qquad \mu>0.
$$

这里 $\mu$ 是惩罚系数。约束偏差无论正负都会增加目标值，但它对参数梯度的贡献为

$$
\mu\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right)\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta).
$$

这里 $\nabla_\theta$ 表示对参数求梯度。一旦约束满足，这个梯度就消失了，而 $-\mathcal L_f$ 的梯度未必为零。因此，参数仍可能被推离约束；有限的惩罚系数下，两个梯度往往要在约束尚有偏差的位置才能平衡。

例如，对实数变量 $x$，问题 $\min_x -x$ 的约束是 $x=0$. 唯一可行解为 $0$，但平方惩罚问题的解是

$$
\underset{x\in\mathbb R}{\operatorname{argmin}}
\left(-x+\frac\mu2x^2\right)=\frac1\mu.
$$

这是因为目标的导数为 $-1+\mu x$，二阶导数为正数 $\mu$. 增大 $\mu$ 可以缩小偏差，却也增大了曲率，限制了梯度下降可用的步长。

我们希望最终停在一个满足约束、且在附近满足约束的参数中无法继续降低目标的位置，也就是约束内的局部最优点。为设计能够停在这里的更新规则，我们先看它需要怎样的梯度平衡。

设 $\theta^\star$ 是这样的局部最优点，两个 loss 在其附近连续可微，且 $\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta^\star)\neq0$. 在这个条件下，满足约束的参数在局部形成一个光滑曲面。沿曲面上一条路径移动，设瞬时方向为 $v\in\mathbb R^d$，则

$$
\left\langle
\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta^\star),v
\right\rangle=0.
$$

这里 $\langle\cdot,\cdot\rangle$ 是 Euclidean 内积。这个等式表示 remote retain loss 沿路径的变化率为零；反过来，每个满足这个正交条件的方向也都是曲面上某条路径的瞬时方向。

在局部最优点，目标 $-\mathcal L_f$ 沿这些路径的变化率也必须为零，否则选择路径的一个移动方向就能继续降低目标。因此，目标梯度在所有垂直于约束梯度的方向上都没有分量，只能与约束梯度平行。于是存在一个实数 $\lambda^\star$，使

$$
\begin{aligned}
-\nabla_\theta\mathcal L_f(\theta^\star)
+\lambda^\star\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta^\star)&=0,\\
\mathcal L_r^{\mathrm{rem}}(\theta^\star)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)&=0.
\end{aligned}
$$

这就是约束最优化的一阶必要条件：第一行要求梯度平衡，第二行要求约束满足。$\square$

为了提供第一行需要的梯度分量，我们引入系数可调的线性项，得到普通 Lagrangian

$$
\mathcal L(\theta;\lambda)
:=-\mathcal L_f(\theta)
+\lambda\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right).
$$

这里 $\lambda\in\mathbb R$ 是 Lagrange multiplier. 当约束满足时，线性项的数值为零，但其参数梯度 $\lambda\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta)$ 仍可非零，因此能够抵消目标梯度。

我们保留平方项对当前偏差的惩罚，得到 augmented Lagrangian：

$$
\begin{aligned}
\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu)
:={}&-\mathcal L_f(\theta)
+\lambda\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right)\\
&+\frac\mu2\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right)^2.
\end{aligned}
$$

其参数梯度为

$$
\begin{aligned}
\nabla_\theta\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu)
={}&-\nabla_\theta\mathcal L_f(\theta)\\
&+\left[\lambda+\mu\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right)\right]
\nabla_\theta\mathcal L_r^{\mathrm{rem}}(\theta).
\end{aligned}
$$

线性项提供能够在约束满足时保留下来的平衡系数，平方项根据当前偏差提供修正。在前面的标量例子中，目标变成 $-x+\lambda x+\mu x^2/2$；如果 $\lambda=1$，最优点就是 $x=0$，不需要让 $\mu$ 无限增大。

注意，固定有限的 $\lambda,\mu$ 后，最小化 augmented Lagrangian 仍可能得到不满足约束的参数。惩罚项改变了目标值，却没有将不可行参数排除出搜索范围。我们还需要根据留下的偏差调整乘子。

## 为什么参数下降、乘子上升

固定 $\mu>0$，定义 augmented dual function

$$
q_\mu(\lambda)
:=\inf\limits_\theta
\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu).
$$

这里 $\inf$ 是下确界；若最小值能取得，它就是充分优化参数后的最小目标值。对任何满足约束的参数，线性项与平方项均为零，因此对任意 $\lambda$，

$$
\begin{aligned}
q_\mu(\lambda)
&\leq
\inf\limits_{\theta:\,
\mathcal L_r^{\mathrm{rem}}(\theta)
=\mathcal L_r^{\mathrm{rem}}(\theta_0)}
\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu)\\
&=
\inf\limits_{\theta:\,
\mathcal L_r^{\mathrm{rem}}(\theta)
=\mathcal L_r^{\mathrm{rem}}(\theta_0)}
-\mathcal L_f(\theta).
\end{aligned}
$$

第一步只是把搜索范围从所有参数缩小为满足约束的参数。右边是原约束问题的最优值，不随乘子改变。因此，$q_\mu(\lambda)$ 是这个最优值的下界，我们希望通过

$$
\max\limits_{\lambda\in\mathbb R}q_\mu(\lambda)
$$

让下界尽可能紧。这解释了两个不同方向的优化：对参数做最小化，是求出当前乘子对应的下界；对乘子做最大化，是改善这个下界。

在参数子问题取得最小值、且满足相应可微条件时，记最优参数为 $\theta_\lambda$，有

$$
q_\mu'(\lambda)
=\mathcal L_r^{\mathrm{rem}}(\theta_\lambda)
-\mathcal L_r^{\mathrm{rem}}(\theta_0).
$$

下一节会在明确条件下证明这个等式。它说明，充分优化参数后剩余的约束偏差，就是 dual function 的梯度。于是，选择乘子步长 $\eta_\lambda>0$，梯度上升更新为

$$
\lambda^+
=\lambda+\eta_\lambda\left(
\mathcal L_r^{\mathrm{rem}}(\theta_\lambda)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right).
$$

这里 $\lambda^+$ 是新乘子。remote retain loss 高于原值时，乘子增大，使下一轮参数梯度下降增加一个降低该 loss 的分量；低于原值时则反向调整。

如果反过来对乘子做下降，就会通过降低违反约束的代价来减小目标值。事实上，固定任意一个约束偏差非零的参数，仅调整线性项中的 $\lambda$ 就能让 augmented Lagrangian 趋于 $-\infty$. 因此，我们不是对参数与乘子一起最小化。

## 平方惩罚如何限制 dual 梯度的变化

为了分析乘子步长，以下假设 $-\mathcal L_f$ 在整个参数空间上可微且凸，$\mathcal L_r^{\mathrm{rem}}$ 是仿射函数，并且对每个乘子，augmented Lagrangian 的参数最小值都能取得。这些条件将用于本节及后面的步长、proximal 推导。

由于约束函数仿射，其梯度是固定向量，记为 $a\in\mathbb R^d$，于是

$$
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
=\left\langle a,\theta-\theta_0\right\rangle.
$$

固定两个乘子 $\lambda_1,\lambda_2$，任取各自的参数最优解

$$
\theta_i\in\underset{\theta}{\operatorname{argmin}}
\mathcal L_{\mathrm{aug}}(\theta;\lambda_i,\mu),
\qquad i=1,2.
$$

我们先证明，这两个最优解的约束偏差不会相差太多。由于参数梯度为零，

$$
-\nabla_\theta\mathcal L_f(\theta_i)
+\left(\lambda_i+\mu\left\langle a,\theta_i-\theta_0\right\rangle\right)a
=0.
$$

另一方面，可微凸函数 $-\mathcal L_f$ 满足

$$
\begin{aligned}
-\mathcal L_f(\theta_2)
&\geq-\mathcal L_f(\theta_1)
+\left\langle-\nabla_\theta\mathcal L_f(\theta_1),\theta_2-\theta_1\right\rangle,\\
-\mathcal L_f(\theta_1)
&\geq-\mathcal L_f(\theta_2)
+\left\langle-\nabla_\theta\mathcal L_f(\theta_2),\theta_1-\theta_2\right\rangle.
\end{aligned}
$$

两式相加，再代入驻点等式，得到

$$
\begin{aligned}
0
&\leq\left\langle
-\nabla_\theta\mathcal L_f(\theta_1)
+\nabla_\theta\mathcal L_f(\theta_2),\theta_1-\theta_2
\right\rangle\\
&=-(\lambda_1-\lambda_2)\left\langle a,\theta_1-\theta_2\right\rangle
-\mu\left\langle a,\theta_1-\theta_2\right\rangle^2.
\end{aligned}
$$

因此

$$
\begin{aligned}
\mu\left|\left\langle a,\theta_1-\theta_2\right\rangle\right|^2
&\leq-(\lambda_1-\lambda_2)\left\langle a,\theta_1-\theta_2\right\rangle\\
&\leq|\lambda_1-\lambda_2|
\left|\left\langle a,\theta_1-\theta_2\right\rangle\right|.
\end{aligned}
$$

若内积为零，下面的界直接成立；否则除以它的绝对值，得到

$$
\left|
\mathcal L_r^{\mathrm{rem}}(\theta_1)
-\mathcal L_r^{\mathrm{rem}}(\theta_2)
\right|
\leq\frac1\mu|\lambda_1-\lambda_2|.
$$

这说明，乘子变化引起的最优参数约束偏差变化，最多是乘子变化的 $1/\mu$ 倍。特别地，当两个乘子相同时，任意两个参数最优解都有相同的约束偏差，即使参数最优解本身不唯一。

接着证明这个约束偏差就是 $q_\mu$ 的导数。记 $\theta_\lambda$ 为乘子 $\lambda$ 对应的任意一个参数最优解，$h\in\mathbb R$ 为乘子增量。把旧最优参数代入新目标，得到

$$
\begin{aligned}
q_\mu(\lambda+h)
&\leq\mathcal L_{\mathrm{aug}}(\theta_\lambda;\lambda+h,\mu)\\
&=q_\mu(\lambda)
+h\left(
\mathcal L_r^{\mathrm{rem}}(\theta_\lambda)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right).
\end{aligned}
$$

反过来，$q_\mu(\lambda)$ 是旧乘子 $\lambda$ 下对所有参数取的最小值，因此不超过将新最优参数 $\theta_{\lambda+h}$ 代入旧目标得到的值。固定这个参数，把乘子从 $\lambda+h$ 改回 $\lambda$，只有 Lagrangian 的线性项发生变化，于是

$$
\begin{aligned}
q_\mu(\lambda)
&\leq\mathcal L_{\mathrm{aug}}(\theta_{\lambda+h};\lambda,\mu)\\
&=\mathcal L_{\mathrm{aug}}(\theta_{\lambda+h};\lambda+h,\mu)
-h\left(
\mathcal L_r^{\mathrm{rem}}(\theta_{\lambda+h})
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right)\\
&=q_\mu(\lambda+h)
-h\left(
\mathcal L_r^{\mathrm{rem}}(\theta_{\lambda+h})
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right).
\end{aligned}
$$

最后一步使用了 $\theta_{\lambda+h}$ 正是新乘子 $\lambda+h$ 下的参数最优解。

结合这两个界，以及已经证明的约束偏差变化界，便有

$$
\begin{aligned}
-\frac{h^2}{\mu}
&\leq h\left(
\mathcal L_r^{\mathrm{rem}}(\theta_{\lambda+h})
-\mathcal L_r^{\mathrm{rem}}(\theta_\lambda)
\right)\\
&\leq q_\mu(\lambda+h)-q_\mu(\lambda)
-h\left(
\mathcal L_r^{\mathrm{rem}}(\theta_\lambda)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right)
\leq0.
\end{aligned}
$$

因此，减去这一阶项后的误差绝对值至多为 $h^2/\mu$，除以 $|h|$ 后随 $h\to0$ 趋于零。这证明了

$$
q_\mu'(\lambda)
=\mathcal L_r^{\mathrm{rem}}(\theta_\lambda)
-\mathcal L_r^{\mathrm{rem}}(\theta_0).
$$

代入之前的约束偏差变化界，最终得到

$$
\boxed{
\left|q_\mu'(\lambda_1)-q_\mu'(\lambda_2)\right|
\leq\frac1\mu|\lambda_1-\lambda_2|.
}
\qquad\square
$$

这个性质称为梯度的 Lipschitz 连续性，$1/\mu$ 是变化速率的上界。

## 为什么乘子步长取为 \(\mu\)

我们利用梯度变化界，估计移动一次至少能改善多少 dual function. 设 $s\in\mathbb R$ 是乘子增量，$t\in[0,1]$ 是沿移动路径的位置参数。由微积分基本定理，

$$
\begin{aligned}
q_\mu(\lambda+s)-q_\mu(\lambda)-q_\mu'(\lambda)s
&=\int\limits_0^1
\left(q_\mu'(\lambda+ts)-q_\mu'(\lambda)\right)s\,\mathrm dt\\
&\geq-\int\limits_0^1\frac{t s^2}{\mu}\,\mathrm dt
=-\frac{s^2}{2\mu}.
\end{aligned}
$$

于是

$$
q_\mu(\lambda+s)
\geq q_\mu(\lambda)+q_\mu'(\lambda)s-\frac{s^2}{2\mu}.
$$

右边是由函数性质推导出的改善保证。我们选择让这个保证最大的增量：

$$
\begin{aligned}
s
&=\underset{s\in\mathbb R}{\operatorname{argmax}}
\left\{q_\mu'(\lambda)s-\frac{s^2}{2\mu}\right\}\\
&=\mu q_\mu'(\lambda).
\end{aligned}
$$

最后一步由对 $s$ 求导得到：$q_\mu'(\lambda)-s/\mu=0$，且二阶导数 $-1/\mu<0$. 所以

$$
\begin{aligned}
\lambda^+
&=\lambda+\mu q_\mu'(\lambda)\\
&=\lambda+\mu\left(
\mathcal L_r^{\mathrm{rem}}(\theta_\lambda)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right),\\
q_\mu(\lambda^+)
&\geq q_\mu(\lambda)+\frac\mu2|q_\mu'(\lambda)|^2.
\end{aligned}
$$

这给出了取步长 $\mu$ 的独立依据：平方惩罚系数 $\mu$ 决定 dual 梯度的变化界 $1/\mu$；根据这个界，步长 $\mu$ 最大化了我们能保证的单步改善。$\square$

注意，这不表示步长 $\mu$ 最大化了真实的函数改善，也不表示其他步长不合理。它最大化的是上述下界。惩罚强度 $\mu$ 的具体数值仍需选择，但在它给定后，乘子步长与它配套便有了明确依据。

## 论文中的实际更新

论文从 $\theta=\theta_0$、$\lambda=0$ 开始，在第一阶段交替执行

$$
\begin{aligned}
\theta&\leftarrow\theta-\eta_1\nabla_\theta
\mathcal L_{\mathrm{aug}}(\theta;\lambda,\mu),\\
\lambda&\leftarrow\lambda+\mu\left(
\mathcal L_r^{\mathrm{rem}}(\theta)
-\mathcal L_r^{\mathrm{rem}}(\theta_0)
\right).
\end{aligned}
$$

这里 $\eta_1>0$ 是参数学习率，乘子更新使用刚更新过的参数。参数更新尝试兼顾 forgetting 与当前约束代价；乘子更新积累约束偏差，调整后续迭代中的约束权重。在约束恰好满足时，乘子保持当前值，而不会归零。

注意，论文没有假设 $-\mathcal L_f$ 凸，也没有假设 $\mathcal L_r^{\mathrm{rem}}$ 仿射，更没有将每次参数子问题精确求解到全局最优。因此，上面的 $1/\mu$ 梯度变化界、dual function 单步改善保证和精确 proximal 等价关系，都不能直接作为这篇论文的理论保证。

论文采用的是标准 augmented Lagrangian 的配套更新。上述推导解释了这种标准设计在适用条件下的数学依据，而它在神经网络上的使用保留了“根据约束偏差调整权重”的机制。有限次更新仍可能留下约束偏差，步长同取 $\mu$ 也不意味着它在该非凸任务上必然优于其他选择。
